import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Wrench, RefreshCcw } from "lucide-react";
import { api } from "../lib/api";
import { FormModal, FormField, FormTextarea } from "./Modal";

const MaintenanceActionMenu = ({
  entityType = "asset",
  item,
  onUpdated,
  disabled = false,
  isVisible = true,
  className = "",
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const shouldRender =
    isVisible &&
    !disabled &&
    !!item &&
    item?.maintenance_status !== "in_progress";

  const options = useMemo(
    () => [
      {
        value: "repair",
        label: t("maintenance.repair"),
        icon: <Wrench className="h-4 w-4" />,
      },
      {
        value: "replacement",
        label: t("maintenance.replacement"),
        icon: <RefreshCcw className="h-4 w-4" />,
      },
    ],
    [t]
  );

  const modalTitle = useMemo(() => {
    if (selectedType === "repair") return t("maintenance.modalTitleRepair");
    if (selectedType === "replacement")
      return t("maintenance.modalTitleReplacement");
    return t("maintenance.modalTitle");
  }, [selectedType, t]);

  const submitLabel = useMemo(() => {
    if (selectedType === "repair") return t("maintenance.submitRepair");
    if (selectedType === "replacement")
      return t("maintenance.submitReplacement");
    return t("maintenance.submit");
  }, [selectedType, t]);

  const handleSelect = (value) => {
    setSelectedType(value);
    setReason("");
    setError("");
    setShowModal(true);
    setOpen(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setReason("");
    setSelectedType(null);
    setError("");
  };

  useEffect(() => {
    if (!open || !shouldRender) return;

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyNavigation = (event) => {
      if (!open) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedIndex(
          (prev) => (prev - 1 + options.length) % options.length
        );
      } else if (event.key === "Enter") {
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) {
          handleSelect(option.value);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyNavigation);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyNavigation);
    };
  }, [open, shouldRender, options, highlightedIndex]);

  useEffect(() => {
    if (open && shouldRender) {
      setHighlightedIndex(0);
    }
  }, [open, shouldRender]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedType) return;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      setError(t("maintenance.reasonRequired"));
      return;
    }

    try {
      setSubmitting(true);
      const endpoint =
        entityType === "asset"
          ? `/assets/${item.id}/maintenance`
          : `/requests/${item.id}/maintenance`;

      const response = await api.post(endpoint, {
        type: selectedType,
        reason: trimmed,
      });

      const updated = response.data?.asset || response.data?.request;
      if (updated && typeof onUpdated === "function") {
        onUpdated(updated);
      }
      if (response.data?.message) {
        alert(response.data.message);
      } else {
        alert(t("maintenance.requestSuccess"));
      }
      handleCloseModal();
    } catch (err) {
      const message =
        err?.response?.data?.message || t("maintenance.requestError");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      data-dropdown="maintenance"
    >
      <button
        type="button"
        onClick={() =>
          setOpen((prev) => {
            const next = !prev;
            if (next) setHighlightedIndex(0);
            return next;
          })
        }
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {t("maintenance.dropdown")}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-48 origin-top-right rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                  highlightedIndex === index
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.icon}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <FormModal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={modalTitle}
        onSubmit={handleSubmit}
        submitText={submitLabel}
        cancelText={t("common.cancel")}
        isLoading={submitting}
        size="sm"
      >
        <FormField label={t("maintenance.reasonLabel")} required error={error}>
          <FormTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={t("maintenance.reasonPlaceholder")}
            required
          />
        </FormField>
      </FormModal>
    </div>
  );
};

export default MaintenanceActionMenu;
