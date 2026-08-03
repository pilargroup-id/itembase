import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, ChevronRight, SearchMd, XClose } from '../../template/TemplateIcons.jsx'

const parentColumns = [
  { key: 'columns:parent_code', field: 'parent_code', label: 'Parent Item', param: 'columns' },
  { key: 'columns:item_name', field: 'item_name', label: 'Item Name', param: 'columns' },
  { key: 'columns:brand_code', field: 'brand_code', label: 'Brand', param: 'columns' },
  { key: 'columns:subbrand_name', field: 'subbrand_name', label: 'Sub Brand', param: 'columns' },
  { key: 'columns:category_detail', field: 'category_detail', label: 'Category', param: 'columns' },
  { key: 'columns:item_type_code', field: 'item_type_code', label: 'Item Source', param: 'columns' },
  { key: 'columns:parent_name', field: 'parent_name', label: 'Parent Name', param: 'columns' },
  { key: 'columns:status', field: 'status', label: 'Status', param: 'columns' },
  { key: 'columns:ports', field: 'ports', label: 'Port', param: 'columns' },
  {
    key: 'columns:variant_attributes',
    field: 'variant_attributes',
    label: 'Variant Attributes',
    param: 'columns',
  },
  { key: 'columns:created_at', field: 'created_at', label: 'Created At', param: 'columns' },
  { key: 'columns:updated_at', field: 'updated_at', label: 'Updated At', param: 'columns' },
]

const itemColumns = [
  { key: 'columns:item_code', field: 'item_code', label: 'Item Code', param: 'columns' },
  { key: 'columns:barcode', field: 'barcode', label: 'Barcode', param: 'columns' },
  { key: 'columns:item_name', field: 'item_name', label: 'Item Name', param: 'columns' },
  { key: 'columns:selling_name', field: 'selling_name', label: 'Selling Name', param: 'columns' },
  { key: 'columns:parent_code', field: 'parent_code', label: 'Parent', param: 'columns' },
  { key: 'columns:uom_code', field: 'uom_code', label: 'UOM', param: 'columns' },
  { key: 'columns:qty_per_pack', field: 'qty_per_pack', label: 'Qty per Pack', param: 'columns' },
  { key: 'columns:height', field: 'height', label: 'Height', param: 'columns' },
  { key: 'columns:width', field: 'width', label: 'Width', param: 'columns' },
  { key: 'columns:depth', field: 'depth', label: 'Depth', param: 'columns' },
  {
    key: 'columns:gross_weight_pack',
    field: 'gross_weight_pack',
    label: 'Gross Weight Pack',
    param: 'columns',
  },
  {
    key: 'columns:production_time_days',
    field: 'production_time_days',
    label: 'Production Time Days',
    param: 'columns',
  },
  { key: 'columns:is_active', field: 'is_active', label: 'Active', param: 'columns' },
  { key: 'columns:variants', field: 'variants', label: 'Variants', param: 'columns' },
  { key: 'columns:created_at', field: 'created_at', label: 'Created At', param: 'columns' },
  { key: 'columns:updated_at', field: 'updated_at', label: 'Updated At', param: 'columns' },
]

const bundleColumns = [
  {
    key: 'columns:item_code',
    field: 'item_code',
    label: 'Bundle Item Code',
    param: 'columns',
    group: 'Bundles',
  },
  { key: 'columns:barcode', field: 'barcode', label: 'Barcode', param: 'columns', group: 'Bundles' },
  { key: 'columns:item_name', field: 'item_name', label: 'Item Name', param: 'columns', group: 'Bundles' },
  {
    key: 'columns:selling_name',
    field: 'selling_name',
    label: 'Selling Name',
    param: 'columns',
    group: 'Bundles',
  },
  { key: 'columns:parent_code', field: 'parent_code', label: 'Parent', param: 'columns', group: 'Bundles' },
  { key: 'columns:uom_code', field: 'uom_code', label: 'UOM', param: 'columns', group: 'Bundles' },
  { key: 'columns:is_active', field: 'is_active', label: 'Active', param: 'columns', group: 'Bundles' },
  { key: 'columns:created_at', field: 'created_at', label: 'Created At', param: 'columns', group: 'Bundles' },
  { key: 'columns:updated_at', field: 'updated_at', label: 'Updated At', param: 'columns', group: 'Bundles' },
  {
    key: 'component_columns:bundle_item_code',
    field: 'bundle_item_code',
    label: 'Bundle Item Code',
    param: 'component_columns',
    group: 'Bundle Components',
  },
  {
    key: 'component_columns:component_item_code',
    field: 'component_item_code',
    label: 'Component Item Code',
    param: 'component_columns',
    group: 'Bundle Components',
  },
  {
    key: 'component_columns:qty',
    field: 'qty',
    label: 'Qty',
    param: 'component_columns',
    group: 'Bundle Components',
  },
  {
    key: 'component_columns:sort_order',
    field: 'sort_order',
    label: 'Sort Order',
    param: 'component_columns',
    group: 'Bundle Components',
  },
]

const exportOptions = [
  {
    value: 'parents',
    label: 'Parent',
    filename: 'item-parents.xlsx',
    columns: parentColumns,
    request: (options) => api.itemData.exports.parents(options),
  },
  {
    value: 'items',
    label: 'Item',
    filename: 'regular-items.xlsx',
    columns: itemColumns,
    request: (options) => api.itemData.exports.items(options),
  },
  {
    value: 'bundles',
    label: 'Bundle',
    filename: 'bundles.xlsx',
    columns: bundleColumns,
    request: (options) => api.itemData.exports.bundles(options),
  },
]

function getInitialSelectedColumns() {
  return exportOptions.reduce(
    (columnsByType, option) => ({
      ...columnsByType,
      [option.value]: option.columns.map((column) => column.key),
    }),
    {},
  )
}

function getSelectedColumnKeys(option, selectedColumnsByType) {
  const selectedKeys = selectedColumnsByType[option.value] || []
  const allowedKeys = new Set(option.columns.map((column) => column.key))

  return option.columns
    .filter((column) => allowedKeys.has(column.key) && selectedKeys.includes(column.key))
    .map((column) => column.key)
}

function getColumnGroups(columns) {
  return columns.reduce((groups, column) => {
    const groupName = column.group || ''
    const existingGroup = groups.find((group) => group.name === groupName)

    if (existingGroup) {
      existingGroup.columns.push(column)
      return groups
    }

    return [...groups, { name: groupName, columns: [column] }]
  }, [])
}

function getFilteredColumns(columns, searchQuery) {
  const normalizedSearch = searchQuery.trim().toLowerCase()

  if (!normalizedSearch) {
    return columns
  }

  return columns.filter((column) =>
    [column.label, column.field, column.group]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch)),
  )
}

function getSelectedColumnSummary(option, selectedColumnKeys) {
  if (selectedColumnKeys.length === 0) {
    return 'Belum ada kolom dipilih'
  }

  if (selectedColumnKeys.length === option.columns.length) {
    return 'Semua kolom dipilih'
  }

  const selectedKeySet = new Set(selectedColumnKeys)
  const labels = option.columns
    .filter((column) => selectedKeySet.has(column.key))
    .map((column) => column.label)

  if (labels.length <= 2) {
    return labels.join(', ')
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} lainnya`
}

function buildExportRequestOptions(option, selectedColumnKeys) {
  const selectedKeySet = new Set(selectedColumnKeys)
  const params = {}
  const paramNames = [...new Set(option.columns.map((column) => column.param))]

  paramNames.forEach((paramName) => {
    const fields = option.columns
      .filter((column) => column.param === paramName && selectedKeySet.has(column.key))
      .map((column) => column.field)

    params[paramName] = fields.length > 0 ? fields.join(',') : 'none'
  })

  return { params }
}

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function DialogExportDashboardContent({
  eyebrow = 'Export Select',
  title = 'Export Item Management',
  onClose,
}) {
  const [selectedExport, setSelectedExport] = useState(exportOptions[0].value)
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(true)
  const [columnSearchByType, setColumnSearchByType] = useState({})
  const [selectedColumnsByType, setSelectedColumnsByType] = useState(() => getInitialSelectedColumns())
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const selectedOption =
    exportOptions.find((option) => option.value === selectedExport) || exportOptions[0]
  const selectedColumnKeys = getSelectedColumnKeys(selectedOption, selectedColumnsByType)
  const selectedColumnKeySet = new Set(selectedColumnKeys)
  const columnMenuId = `download-select-column-menu-${selectedOption.value}`
  const searchQuery = columnSearchByType[selectedOption.value] || ''
  const filteredColumns = getFilteredColumns(selectedOption.columns, searchQuery)
  const selectedColumnGroups = getColumnGroups(filteredColumns)
  const selectedColumnSummary = getSelectedColumnSummary(selectedOption, selectedColumnKeys)
  const isExportDisabled = isExporting || selectedColumnKeys.length === 0

  const handleOptionClick = (optionValue) => {
    setSelectedExport(optionValue)
    setIsColumnDropdownOpen(true)
    setErrorMessage('')
  }

  const handleColumnDropdownToggle = () => {
    setIsColumnDropdownOpen((currentValue) => !currentValue)
    setErrorMessage('')
  }

  const handleColumnSearchChange = (optionValue, value) => {
    setColumnSearchByType((currentSearchByType) => ({
      ...currentSearchByType,
      [optionValue]: value,
    }))
  }

  const handleColumnToggle = (optionValue, columnKey) => {
    setSelectedColumnsByType((currentColumnsByType) => {
      const currentKeys = currentColumnsByType[optionValue] || []
      const nextKeys = currentKeys.includes(columnKey)
        ? currentKeys.filter((key) => key !== columnKey)
        : [...currentKeys, columnKey]

      return {
        ...currentColumnsByType,
        [optionValue]: nextKeys,
      }
    })
    setErrorMessage('')
  }

  const handleExport = async () => {
    if (selectedColumnKeys.length === 0) {
      setErrorMessage('Pilih minimal satu kolom untuk export.')
      return
    }

    setIsExporting(true)
    setErrorMessage('')

    try {
      const blob = await selectedOption.request(
        buildExportRequestOptions(selectedOption, selectedColumnKeys),
      )

      saveBlob(blob, selectedOption.filename)
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal export file.')
    } finally {
      setIsExporting(false)
    }
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup dashboard-popup--export"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-action-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-action-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close item-create-popup__close-button"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <XClose size={22} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="download-select">
            <div className="download-select__options" role="radiogroup" aria-label="Pilih data export">
              {exportOptions.map((option) => {
                const isSelected = selectedExport === option.value
                const optionColumnKeys = getSelectedColumnKeys(option, selectedColumnsByType)

                return (
                  <button
                    type="button"
                    className={`download-select__option${
                      isSelected ? ' download-select__option--selected' : ''
                    }`}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleOptionClick(option.value)}
                    key={option.value}
                  >
                    <span className="download-select__content">
                      <span className="download-select__label">{option.label}</span>
                    </span>
                    <span className="download-select__count">
                      {optionColumnKeys.length}/{option.columns.length} kolom
                    </span>
                    <span
                      className={`download-select__chevron${
                        isSelected ? ' download-select__chevron--open' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronRight size={18} />
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="download-select__columns">
              <div className="download-select__columns-header">
                <span className="download-select__columns-title">{selectedOption.label}</span>
                <span className="download-select__columns-count">
                  {selectedColumnKeys.length} dari {selectedOption.columns.length} kolom
                </span>
              </div>

              <div className="download-select__column-dropdown">
                <button
                  type="button"
                  className={`download-select__column-trigger${
                    isColumnDropdownOpen ? ' download-select__column-trigger--open' : ''
                  }`}
                  aria-expanded={isColumnDropdownOpen}
                  aria-controls={columnMenuId}
                  onClick={handleColumnDropdownToggle}
                >
                  <span className="download-select__column-trigger-copy">
                    <span className="download-select__column-trigger-label">Pilih kolom export</span>
                    <span className="download-select__column-trigger-value">
                      {selectedColumnSummary}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`download-select__column-trigger-icon${
                      isColumnDropdownOpen ? ' download-select__column-trigger-icon--open' : ''
                    }`}
                  />
                </button>

                {isColumnDropdownOpen ? (
                  <div
                    className="download-select__column-menu"
                    id={columnMenuId}
                    role="group"
                    aria-label={`Kolom export ${selectedOption.label}`}
                  >
                    <div className="download-select__column-search">
                      <SearchMd size={16} className="download-select__column-search-icon" />
                      <input
                        className="download-select__column-search-input"
                        type="search"
                        value={searchQuery}
                        aria-label={`Search kolom ${selectedOption.label}`}
                        placeholder="Search column..."
                        onChange={(event) =>
                          handleColumnSearchChange(selectedOption.value, event.target.value)
                        }
                      />
                    </div>

                    {selectedColumnGroups.length > 0 ? (
                      <div className="download-select__column-list">
                        {selectedColumnGroups.map((group) => (
                          <div
                            className="download-select__column-group"
                            key={group.name || selectedOption.value}
                          >
                            {group.name ? (
                              <p className="download-select__column-group-title">{group.name}</p>
                            ) : null}

                            <div className="download-select__column-grid">
                              {group.columns.map((column) => (
                                <label className="download-select__checkbox" key={column.key}>
                                  <input
                                    type="checkbox"
                                    checked={selectedColumnKeySet.has(column.key)}
                                    onChange={() => handleColumnToggle(selectedOption.value, column.key)}
                                  />
                                  <span className="download-select__checkbox-text">
                                    <span className="download-select__checkbox-label">{column.label}</span>
                                    <span className="download-select__checkbox-field">{column.field}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="download-select__column-empty">Kolom tidak ditemukan.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {errorMessage ? (
              <p className="download-select__error">{errorMessage}</p>
            ) : null}
          </div>
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={handleExport}
            disabled={isExportDisabled}
          >
            {isExporting ? 'Exporting...' : 'Export XLSX'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

function DialogExportDashboard({
  isOpen = false,
  eyebrow = 'Export Select',
  title = 'Export Item Management',
  onClose,
}) {
  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return <DialogExportDashboardContent eyebrow={eyebrow} title={title} onClose={onClose} />
}

export default DialogExportDashboard
