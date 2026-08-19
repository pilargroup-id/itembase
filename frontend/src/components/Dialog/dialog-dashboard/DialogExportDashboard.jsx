import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, SearchMd, XClose } from '../../template/TemplateIcons.jsx'

const statusOptions = [
  { value: 'active', label: 'Item Active' },
  { value: 'inactive', label: 'Item Inactive' },
]

const optionalFields = [
  { key: 'main_category', label: 'Main Category' },
  { key: 'sub_category', label: 'Sub Category' },
  { key: 'brand_category', label: 'Brand Category' },
  { key: 'pic', label: 'PIC' },
  { key: 'item_created_date', label: 'Item Created Date' },
  { key: 'item_updated_date', label: 'Item Updated Date' },
  { key: 'port', label: 'Port' },
  { key: 'item_source', label: 'Item Source' },
  { key: 'selling_name', label: 'Selling Name' },
  { key: 'uom', label: 'UOM' },
  { key: 'qty_per_pack', label: 'Qty/Pack' },
  { key: 'height', label: 'Height' },
  { key: 'width', label: 'Width' },
  { key: 'depth', label: 'Depth' },
  { key: 'gross_weight_pack', label: 'Gross Weight/Pack' },
  { key: 'lead_time', label: 'Lead Time' },
]

const defaultSelectedFields = ['main_category', 'sub_category', 'brand_category', 'pic']

function getFilteredFields(searchQuery) {
  const normalizedSearch = searchQuery.trim().toLowerCase()

  if (!normalizedSearch) {
    return optionalFields
  }

  return optionalFields.filter(
    (field) =>
      field.label.toLowerCase().includes(normalizedSearch) ||
      field.key.toLowerCase().includes(normalizedSearch),
  )
}

function getSelectedFieldsSummary(selectedFields) {
  if (selectedFields.length === 0) {
    return 'Hanya kolom default'
  }

  if (selectedFields.length === optionalFields.length) {
    return 'Semua kolom optional dipilih'
  }

  const selectedKeySet = new Set(selectedFields)
  const labels = optionalFields
    .filter((field) => selectedKeySet.has(field.key))
    .map((field) => field.label)

  if (labels.length <= 2) {
    return labels.join(', ')
  }

  return `${labels.slice(0, 2).join(', ')} +${labels.length - 2} lainnya`
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
  const [selectedStatus, setSelectedStatus] = useState(statusOptions[0].value)
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(true)
  const [columnSearch, setColumnSearch] = useState('')
  const [selectedFields, setSelectedFields] = useState(defaultSelectedFields)
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

  const selectedFieldSet = new Set(selectedFields)
  const columnMenuId = 'export-dashboard-column-menu'
  const filteredFields = getFilteredFields(columnSearch)
  const selectedFieldsSummary = getSelectedFieldsSummary(selectedFields)
  const isAllFieldsSelected = selectedFields.length === optionalFields.length
  const selectedStatusLabel =
    statusOptions.find((option) => option.value === selectedStatus)?.label || selectedStatus

  const handleStatusClick = (statusValue) => {
    setSelectedStatus(statusValue)
    setErrorMessage('')
  }

  const handleColumnDropdownToggle = () => {
    setIsColumnDropdownOpen((currentValue) => !currentValue)
  }

  const handleFieldToggle = (fieldKey) => {
    setSelectedFields((currentKeys) =>
      currentKeys.includes(fieldKey)
        ? currentKeys.filter((key) => key !== fieldKey)
        : [...currentKeys, fieldKey],
    )
  }

  const handleSelectAllToggle = () => {
    setSelectedFields((currentKeys) =>
      currentKeys.length === optionalFields.length ? [] : optionalFields.map((field) => field.key),
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')

    try {
      const params = { status: selectedStatus }

      if (selectedFields.length > 0) {
        params.fields = selectedFields.join(',')
      }

      const blob = await api.itemData.export(params)

      saveBlob(blob, `items-${selectedStatus}.xlsx`)
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
            <div className="download-select__columns">
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
                    <span className="download-select__column-trigger-label">
                      Status &amp; Kolom Export
                    </span>
                    <span className="download-select__column-trigger-value">
                      {selectedStatusLabel} · {selectedFieldsSummary}
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
                    aria-label="Kolom optional export"
                  >
                    <div className="download-select__column-search">
                      <SearchMd size={16} className="download-select__column-search-icon" />
                      <input
                        className="download-select__column-search-input"
                        type="search"
                        value={columnSearch}
                        aria-label="Search kolom optional"
                        placeholder="Search column..."
                        onChange={(event) => setColumnSearch(event.target.value)}
                      />
                    </div>

                    <div className="download-select__status">
                      <p className="download-select__column-group-title">Status Item</p>
                      <div
                        className="download-select__status-group"
                        role="radiogroup"
                        aria-label="Pilih status Item"
                      >
                        {statusOptions.map((option) => {
                          const isSelected = selectedStatus === option.value

                          return (
                            <button
                              type="button"
                              className={`download-select__status-option${
                                isSelected ? ' download-select__status-option--selected' : ''
                              }`}
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => handleStatusClick(option.value)}
                              key={option.value}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <label className="download-select__checkbox download-select__checkbox--all">
                      <input
                        type="checkbox"
                        checked={isAllFieldsSelected}
                        onChange={handleSelectAllToggle}
                      />
                      <span className="download-select__checkbox-text">
                        <span className="download-select__checkbox-label">Pilih Semua Kolom</span>
                      </span>
                    </label>

                    {filteredFields.length > 0 ? (
                      <div className="download-select__column-list">
                        <div className="download-select__column-grid">
                          {filteredFields.map((field) => (
                            <label className="download-select__checkbox" key={field.key}>
                              <input
                                type="checkbox"
                                checked={selectedFieldSet.has(field.key)}
                                onChange={() => handleFieldToggle(field.key)}
                              />
                              <span className="download-select__checkbox-text">
                                <span className="download-select__checkbox-label">{field.label}</span>
                              </span>
                            </label>
                          ))}
                        </div>
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
            disabled={isExporting}
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
