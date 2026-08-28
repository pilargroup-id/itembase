import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

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

function DialogExportMasterContent({ type, masterLabel, onClose }) {
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isExporting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, isExporting])

  const handleStatusClick = (statusValue) => {
    setSelectedStatus(statusValue)
    setErrorMessage('')
  }

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')

    try {
      const params = {}

      if (selectedStatus !== 'all') {
        params.status = selectedStatus
      }

      const blob = await api.itemData.exportMaster(type, params)

      saveBlob(blob, `${type}-${selectedStatus}.xlsx`)
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to export file.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleOverlayClick = () => {
    if (!isExporting) {
      onClose?.()
    }
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className="dashboard-popup dashboard-popup--export-master"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-export-master-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Export Select</p>
            <h2 className="dashboard-popup__title" id="dialog-export-master-title">
              Export {masterLabel}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close item-create-popup__close-button"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isExporting}
          >
            <XClose size={22} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="download-select">
            <div className="download-select__status">
              <p className="download-select__column-group-title">{masterLabel} Status</p>
              <div
                className="download-select__status-group download-select__status-group--triple"
                role="radiogroup"
                aria-label={`Select ${masterLabel} status`}
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

            {errorMessage ? <p className="download-select__error">{errorMessage}</p> : null}
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

function DialogExportMaster({ isOpen = false, type, masterLabel = 'Data', onClose }) {
  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  return <DialogExportMasterContent type={type} masterLabel={masterLabel} onClose={onClose} />
}

export default DialogExportMaster
