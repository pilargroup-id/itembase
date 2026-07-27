import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { FileText01, XClose } from '../../template/TemplateIcons.jsx'

const downloadOptions = [
  {
    value: 'parent',
    label: 'Parent',
    description: 'Export data parent dari Item Management',
    filename: 'item-parent.xlsx',
  },
  {
    value: 'items',
    label: 'Items',
    description: 'Export data item regular dari Item Management',
    filename: 'items.xlsx',
  },
  {
    value: 'bundles',
    label: 'Bundles',
    description: 'Export data bundle dan komponennya',
    filename: 'bundles.xlsx',
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
  eyebrow = 'Download Select',
  title = 'Download Item Management',
  onClose,
}) {
  const [selectedDownload, setSelectedDownload] = useState(downloadOptions[0].value)
  const [isDownloading, setIsDownloading] = useState(false)
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
      setSelectedDownload(downloadOptions[0].value)
      setErrorMessage('')
      setIsDownloading(false)
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const selectedOption =
    downloadOptions.find((option) => option.value === selectedDownload) || downloadOptions[0]

  const handleDownload = async () => {
    setIsDownloading(true)
    setErrorMessage('')

    try {
      const blob = await api.itemDownloads.xlsx({ download: selectedOption.value })

      saveBlob(blob, selectedOption.filename)
      onClose?.()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal download file.')
    } finally {
      setIsDownloading(false)
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
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={onClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="download-select">
            <div className="download-select__options" role="radiogroup" aria-label="Pilih data download">
              {downloadOptions.map((option) => {
                const isSelected = selectedDownload === option.value

                return (
                  <label
                    key={option.value}
                    className={`download-select__option${isSelected ? ' download-select__option--selected' : ''}`}
                  >
                    <input
                      className="download-select__radio"
                      type="radio"
                      name="download-type"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setSelectedDownload(option.value)}
                    />
                    <span className="download-select__icon">
                      <FileText01 size={18} />
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
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
            disabled={isDownloading}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? 'Downloading...' : 'Download XLSX'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDownloadSelect
