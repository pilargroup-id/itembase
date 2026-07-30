import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { Export01, XClose } from '../../template/TemplateIcons.jsx'

const exportOptions = [
  {
    value: 'parents',
    label: 'Parent',
    description: 'Export data parent dari Item Management',
    filename: 'item-parent.xlsx',
    request: (options) => api.itemData.exports.parents(options),
  },
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

function DialogDownloadSelect({
  isOpen = false,
  eyebrow = 'Export Select',
  title = 'Export Item Management',
  onClose,
}) {
  const [selectedExport, setSelectedExport] = useState(exportOptions[0].value)
  const [isExporting, setIsExporting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setSelectedExport(exportOptions[0].value)
      setErrorMessage('')
      setIsExporting(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const selectedOption =
    exportOptions.find((option) => option.value === selectedExport) || exportOptions[0]

  const handleExport = async () => {
    setIsExporting(true)
    setErrorMessage('')

    try {
      const blob = await selectedOption.request()

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
        className="dashboard-popup"
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

                return (
                  <label
                    key={option.value}
                    className={`download-select__option${isSelected ? ' download-select__option--selected' : ''}`}
                  >
                    <input
                      className="download-select__radio"
                      type="radio"
                      name="export-type"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setSelectedExport(option.value)}
                    />
                    <span className="download-select__icon">
                      <Export01 size={18} />
                    </span>
                    <span className="download-select__content">
                      <span className="download-select__label">{option.label}</span>
                      <span className="download-select__description">{option.description}</span>
                    </span>
                  </label>
                )
              })}
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

export default DialogDownloadSelect
