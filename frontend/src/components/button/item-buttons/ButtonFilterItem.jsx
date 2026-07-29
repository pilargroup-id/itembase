import { useEffect, useMemo, useState } from 'react'
import Popover from '@mui/material/Popover'

import FilterDropdownItem from '../../dropdown/filter-item/FilterDropdownItem.jsx'
import { CheckSquare, Settings01, XClose } from '../../template/TemplateIcons.jsx'

const ALL_FILTER_VALUE = 'all'
const filterKeys = ['itemKind', 'parent', 'category', 'businessUnit', 'createdBy']

function countActiveFilters(filters = {}, sortValue = '') {
  const activeFilters = filterKeys.filter((filterKey) => {
    const value = String(filters[filterKey] ?? '').trim()

    return value && value !== ALL_FILTER_VALUE
  }).length

  return activeFilters + (sortValue && sortValue !== 'date-desc' ? 1 : 0)
}

function cloneFilters(filters = {}) {
  return filterKeys.reduce(
    (nextFilters, filterKey) => ({
      ...nextFilters,
      [filterKey]: filters[filterKey] ?? ALL_FILTER_VALUE,
    }),
    {},
  )
}

function ButtonFilterItem({
  className = '',
  filterConfigs = [],
  filterOptions = {},
  filters = {},
  sortOptions = [],
  sortValue = 'date-desc',
  onApply,
  onReset,
  children = 'Filter',
  iconSize = 18,
  type = 'button',
  ...buttonProps
}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const [draftFilters, setDraftFilters] = useState(() => cloneFilters(filters))
  const [draftSortValue, setDraftSortValue] = useState(sortValue)
  const isPopoverOpen = Boolean(anchorEl)
  const activeFilterCount = countActiveFilters(filters, sortValue)
  const buttonClassName = ['users-table-card__action item-filter-button', className]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    if (!isPopoverOpen) {
      setDraftFilters(cloneFilters(filters))
      setDraftSortValue(sortValue)
    }
  }, [filters, isPopoverOpen, sortValue])

  const visibleFilterConfigs = useMemo(
    () => filterKeys
      .map((filterKey) => filterConfigs.find((filterConfig) => filterConfig.key === filterKey))
      .filter(Boolean),
    [filterConfigs],
  )

  const handleOpenPopover = (event) => {
    setDraftFilters(cloneFilters(filters))
    setDraftSortValue(sortValue)
    setAnchorEl(event.currentTarget)
  }

  const handleClosePopover = () => {
    setAnchorEl(null)
  }

  const handleApply = (event) => {
    event.preventDefault()
    onApply?.({
      filters: draftFilters,
      sortValue: draftSortValue,
    })
    setAnchorEl(null)
  }

  const handleReset = () => {
    const nextFilters = cloneFilters()

    setDraftFilters(nextFilters)
    setDraftSortValue('date-desc')
    onReset?.({
      filters: nextFilters,
      sortValue: 'date-desc',
    })
  }

  return (
    <>
      <button
        {...buttonProps}
        type={type}
        className={buttonClassName}
        onClick={handleOpenPopover}
        aria-expanded={isPopoverOpen}
        aria-haspopup="dialog"
      >
        <Settings01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
        {activeFilterCount > 0 ? (
          <span className="item-filter-button__badge" aria-label={`${activeFilterCount} filter aktif`}>
            {activeFilterCount}
          </span>
        ) : null}
      </button>

      <Popover
        open={isPopoverOpen}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          className: 'item-filter-popover__paper',
        }}
      >
        <form
          className="item-filter-popover"
          role="dialog"
          aria-modal="false"
          aria-labelledby="popover-filter-item-title"
          onSubmit={handleApply}
        >
          <div className="item-filter-popover__header">
            <div>
              <p className="item-filter-popover__eyebrow">Filter Item</p>
              <h2 className="item-filter-popover__title" id="popover-filter-item-title">
                Atur Filter
              </h2>
            </div>

            <button
              type="button"
              className="item-filter-popover__close"
              aria-label="Tutup filter"
              onClick={handleClosePopover}
            >
              <XClose size={20} />
            </button>
          </div>

          <div className="item-filter-popover__body">
            <div className="item-filter-popover__grid">
              <FilterDropdownItem
                className="parent-table-filter parent-table-filter--sort item-filter-popover__field"
                options={sortOptions}
                value={draftSortValue}
                label="Sort"
                placeholder="Date Desc"
                searchable={false}
                onChange={setDraftSortValue}
              />

              {visibleFilterConfigs.map((filterConfig) => (
                <FilterDropdownItem
                  key={filterConfig.key}
                  className="parent-table-filter item-filter-popover__field"
                  options={filterOptions[filterConfig.key] ?? []}
                  value={draftFilters[filterConfig.key]}
                  label={filterConfig.label}
                  placeholder={filterConfig.placeholder}
                  searchPlaceholder={filterConfig.searchPlaceholder}
                  emptyMessage={filterConfig.emptyMessage}
                  searchable={filterConfig.searchable ?? true}
                  onChange={(nextValue) =>
                    setDraftFilters((currentFilters) => ({
                      ...currentFilters,
                      [filterConfig.key]: nextValue,
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <div className="item-filter-popover__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
            >
              <CheckSquare size={16} aria-hidden="true" />
              Apply
            </button>
          </div>
        </form>
      </Popover>
    </>
  )
}

export default ButtonFilterItem
