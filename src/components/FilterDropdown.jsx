import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";

const FilterDropdown = ({
  options = [],
  value = "all",
  onChange = () => {},
  placeholder = "All",
  searchable = true,
  className = "",
  name = "",
  icon = null,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [preSelectedIndex, setPreSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Find current selected option
  const selectedOption = options.find((option) => option.value === value);

  // Auto-scroll to pre-selected option
  useEffect(() => {
    if (
      isOpen &&
      preSelectedIndex >= 0 &&
      optionRefs.current[preSelectedIndex]
    ) {
      optionRefs.current[preSelectedIndex].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [isOpen, preSelectedIndex]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        setPreSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus();
        }
        return;
      }
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      setPreSelectedIndex(-1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((prev) => {
        const nextIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
        setPreSelectedIndex(nextIndex);
        return nextIndex;
      });
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const nextIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
        setPreSelectedIndex(nextIndex);
        return nextIndex;
      });
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    }
  };

  // Handle option selection
  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    setPreSelectedIndex(-1);
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    setPreSelectedIndex(-1);
  };

  // Handle dropdown toggle
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          w-full px-3 py-2 pr-10 text-left bg-white border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500
          transition-all duration-200 ease-in-out
          cursor-pointer hover:border-gray-400 hover:shadow-md
          ${
            isOpen
              ? "ring-2 ring-accent-500 border-accent-500"
              : "border-gray-300"
          }
        `}
        {...props}
      >
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search options..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                {searchable && searchTerm
                  ? "No options found"
                  : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  ref={(el) => (optionRefs.current[index] = el)}
                  onClick={() => handleSelect(option)}
                  className={`
                    px-3 py-2 text-sm cursor-pointer transition-colors duration-150
                    flex items-center justify-between
                    ${
                      highlightedIndex === index
                        ? "bg-accent-50 text-accent-700"
                        : "hover:bg-gray-50 text-gray-900"
                    }
                    ${
                      option.value === value
                        ? "bg-accent-100 text-accent-800"
                        : ""
                    }
                  `}
                >
                  <span className="flex items-center">
                    {option.icon && <span className="mr-2">{option.icon}</span>}
                    {option.label}
                  </span>
                  {option.value === value && (
                    <Check className="h-4 w-4 text-accent-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;
