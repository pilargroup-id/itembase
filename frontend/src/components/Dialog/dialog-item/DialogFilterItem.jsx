import { useEffect } from "react"
import { createPortal } from "react-dom"
import FormControl from "@mui/material/FormControl"
import InputLabel from "@mui/material/InputLabel"
import MenuItem from "@mui/material/MenuItem"
import Select from "@mui/material/Select"

import { FilterFunnel, XClose } from "../../template/TemplateIcons.jsx"

function normalizeFilterValue(value) {
  return String(value ?? "").trim()
}

function getFilterOptionsWithSelected(options = [], selectedValue, fallbackLabel = "", allFilterValue = "all") {
  const normalizedSelectedValue = normalizeFilterValue(selectedValue)

  if (
    !normalizedSelectedValue ||
    normalizedSelectedValue === allFilterValue ||
    options.some((option) => option.value === normalizedSelectedValue)
  ) {
    return options
  }

  return [
    ...options,
    {
      value: normalizedSelectedValue,
      label: normalizeFilterValue(fallbackLabel) || normalizedSelectedValue,
    },
  ]
}

function getFilterLabel(filterFieldOptions, filterKey) {
  return filterFieldOptions.find((filterConfig) => filterConfig.key === filterKey)?.label ?? filterKey
}

function getSelectedFilterSummary(filterFieldOptions, selectedFilterKeys) {
  const filterKeys = Array.isArray(selectedFilterKeys) ? selectedFilterKeys : []

  if (filterKeys.length === 0) {
    return "No filter selected"
  }

  const filterLabels = filterKeys.map((filterKey) => getFilterLabel(filterFieldOptions, filterKey))

  if (filterLabels.length <= 2) {
    return filterLabels.join(", ")
  }

  return `${filterLabels.slice(0, 2).join(", ")} +${filterLabels.length - 2}`
}

function DialogFilterItem({
  isOpen = false,
  eyebrow = "Filter",
  title = "Item / SKU Table Filter",
  filterConfigs = [],
  filterFieldOptions = [],
  selectedFilterKeys = [],
  selectedFilterConfigs = [],
  filters = {},
  filterOptions = {},
  allFilterValue = "all",
  defaultSortValue = "date-desc",
  sortOptions = [],
  sortValue = defaultSortValue,
  menuProps,
  hasSelectedSortFilter = false,
  onClose,
  onFilterKeyToggle,
  onFilterChange,
  onSortChange,
  onReset,
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === "undefined") {
    return null
  }

  const selectedFieldSet = new Set(selectedFilterKeys)
  const selectedFilterSummary = getSelectedFilterSummary(filterFieldOptions, selectedFilterKeys)
  const canReset =
    selectedFilterKeys.length > 0 ||
    sortValue !== defaultSortValue ||
    filterConfigs.some((filterConfig) => filters[filterConfig.key] !== allFilterValue)

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup parent-filter-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-filter-item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-filter-item-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body parent-filter-popup__body">
          <div className="parent-filter-popup__layout">
            <section className="parent-filter-popup__section" aria-labelledby="item-filter-fields-title">
              <div className="parent-filter-popup__section-header">
                <h3 className="parent-filter-popup__section-title" id="item-filter-fields-title">
                  Filter Fields
                </h3>
                <span className="parent-filter-popup__summary">
                  {selectedFilterSummary}
                </span>
              </div>

              <div className="parent-filter-popup__choice-grid">
                {filterFieldOptions.map((filterConfig) => {
                  const isSelected = selectedFieldSet.has(filterConfig.key)

                  return (
                    <label
                      className={[
                        "parent-filter-popup__choice",
                        isSelected ? "parent-filter-popup__choice--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={filterConfig.key}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onFilterKeyToggle?.(filterConfig.key)}
                      />
                      <span className="parent-filter-popup__choice-copy">
                        <span className="parent-filter-popup__choice-label">
                          {filterConfig.label}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>

            <section className="parent-filter-popup__section" aria-labelledby="item-filter-values-title">
              <div className="parent-filter-popup__section-header">
                <h3 className="parent-filter-popup__section-title" id="item-filter-values-title">
                  Filter Values
                </h3>
              </div>

              {selectedFilterKeys.length > 0 ? (
                <div className="parent-filter-popup__value-grid">
                  {hasSelectedSortFilter ? (
                    <FormControl
                      size="small"
                      className="parent-table-mui-filter parent-filter-popup__field"
                    >
                      <InputLabel id="item-dialog-sort-label" shrink>
                        Sort By
                      </InputLabel>
                      <Select
                        labelId="item-dialog-sort-label"
                        id="item-dialog-sort-select"
                        value={sortValue}
                        label="Sort By"
                        onChange={onSortChange}
                        MenuProps={menuProps}
                      >
                        {sortOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value} dense>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : null}

                  {selectedFilterConfigs.map((filterConfig) => {
                    const selectedValue = filters[filterConfig.key] ?? allFilterValue
                    const options = getFilterOptionsWithSelected(
                      filterOptions[filterConfig.key] ?? [],
                      selectedValue,
                      selectedValue,
                      allFilterValue,
                    )

                    return (
                      <FormControl
                        key={filterConfig.key}
                        size="small"
                        className="parent-table-mui-filter parent-filter-popup__field"
                      >
                        <InputLabel id={`item-dialog-filter-${filterConfig.key}-label`} shrink>
                          {filterConfig.label}
                        </InputLabel>
                        <Select
                          labelId={`item-dialog-filter-${filterConfig.key}-label`}
                          id={`item-dialog-filter-${filterConfig.key}-select`}
                          value={selectedValue}
                          label={filterConfig.label}
                          onChange={(event) => onFilterChange?.(filterConfig.key, event.target.value)}
                          MenuProps={menuProps}
                        >
                          {options.map((option) => (
                            <MenuItem key={option.value} value={option.value} dense>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )
                  })}
                </div>
              ) : (
                <div className="parent-filter-popup__empty">
                  <FilterFunnel size={22} aria-hidden="true" />
                  <span>No filter selected</span>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="dashboard-popup__actions parent-filter-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            disabled={!canReset}
            onClick={onReset}
          >
            Reset
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogFilterItem
