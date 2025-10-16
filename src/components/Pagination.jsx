import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Check, ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
}) => {
  const { t } = useTranslation();

  // Combobox states
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownDirection, setDropdownDirection] = useState("down");

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Calculate dropdown direction based on available space
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedDropdownHeight = 200; // approximate dropdown height

      if (spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow) {
        setDropdownDirection("up");
      } else {
        setDropdownDirection("down");
      }
    }
  }, [isOpen]);

  // Create filtered options based on input
  const getFilteredOptions = () => {
    if (!inputValue) return itemsPerPageOptions;

    const filtered = itemsPerPageOptions.filter((option) =>
      option.toString().includes(inputValue)
    );

    // If input is a valid number not in the list, add it as custom option
    const numValue = parseInt(inputValue);
    if (
      numValue &&
      numValue > 0 &&
      numValue <= totalItems &&
      !itemsPerPageOptions.includes(numValue)
    ) {
      filtered.push(numValue);
    }

    return filtered.sort((a, b) => a - b);
  };

  const filteredOptions = getFilteredOptions();

  const handleOpen = () => {
    setIsOpen(true);
    setInputValue("");
    setHighlightedIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setInputValue("");
    setHighlightedIndex(-1);
  };

  const handleSelectOption = (value) => {
    onItemsPerPageChange(value);
    handleClose();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelectOption(filteredOptions[highlightedIndex]);
      } else if (inputValue) {
        const value = parseInt(inputValue);
        if (value && value > 0 && value <= totalItems) {
          handleSelectOption(value);
        }
      }
    } else if (e.key === "Escape") {
      handleClose();
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-gray-50 rounded-lg">
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {t("common.itemsPerPage", { defaultValue: "Items per page" })}:
        </span>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={isOpen ? inputValue : itemsPerPage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onClick={handleOpen}
              placeholder={isOpen ? itemsPerPage.toString() : ""}
              className="w-20 pl-3 pr-8 py-1 text-sm text-gray-900 border border-gray-300 rounded hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 bg-white cursor-pointer"
              readOnly={!isOpen}
            />
            <ChevronDown
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform duration-200 pointer-events-none ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>

          {isOpen && (
            <div
              className={`absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto ${
                dropdownDirection === "up"
                  ? "bottom-full mb-1"
                  : "top-full mt-1"
              }`}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    className={`relative w-full text-left py-2 pl-3 pr-9 cursor-pointer hover:bg-gray-50 ${
                      highlightedIndex === index
                        ? "bg-accent-50 text-accent-900"
                        : itemsPerPage === option
                        ? "bg-accent-50 text-accent-900"
                        : "text-gray-900"
                    }`}
                  >
                    <span className="block truncate text-sm">{option}</span>
                    {itemsPerPage === option && (
                      <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <Check className="h-4 w-4 text-accent-600" />
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">
                  {inputValue
                    ? t("common.pressEnterToUseCustom", { defaultValue: "Press Enter to use custom value" })
                    : t("common.noOptions", { defaultValue: "No options" })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Page info */}
      <div className="text-sm text-gray-600">
        {t("common.showingItems", {
          defaultValue: "Showing {{start}} to {{end}} of {{total}} items",
          start: startItem,
          end: endItem,
          total: totalItems,
        })}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("common.previous", { defaultValue: "Previous" })}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === "..." ? (
              <span className="px-3 py-1 text-sm text-gray-500">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === page
                    ? "bg-accent-500 text-white border-accent-500"
                    : "border-gray-300 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title={t("common.next", { defaultValue: "Next" })}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;



