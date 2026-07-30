import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

function getResponseData(response) {
  return response?.data && !Array.isArray(response.data) ? response.data : response
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows : []
}

function formatNumber(value) {
  const numericValue = Number(value ?? 0)

  return Number.isFinite(numericValue) ? numericValue.toLocaleString('id-ID') : '0'
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) {
    return '-'
  }

  return errors
    .map((error) => {
      if (typeof error === 'string') {
        return error
      }

      return error?.message || error?.error_message || error?.code || JSON.stringify(error)
    })
    .filter(Boolean)
    .join('; ')
}

function getOriginalSummary(original) {
  if (!original || typeof original !== 'object') {
    return '-'
  }

  const preferredKeys = ['item_code', 'item_name', 'selling_name', 'parent_code', 'uom_code']
  const values = preferredKeys
    .map((key) => original[key])
    .filter((value) => value !== undefined && value !== null && value !== '')

  if (values.length > 0) {
    return values.join(' / ')
  }

  return Object.entries(original)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ') || '-'
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

function SummaryMetric({ label, value, tone = 'neutral' }) {
  return (
    <div className={`parent-import-summary__metric parent-import-summary__metric--${tone}`}>
      <span className="parent-import-summary__label">{label}</span>
      <strong className="parent-import-summary__value">{formatNumber(value)}</strong>
    </div>
  )
}

function DialogImportItem({
  isOpen = false,
  eyebrow = 'Import Item',
  title = 'Preview Import Item',
  commitErrorMessage = 'Gagal commit import item.',
  errorFileName = 'item-import-errors.xlsx',
  fileName = '',
  previewResponse = null,
  errorMessage = '',
  isPreviewing = false,
  onClose,
  onCommitted,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [commitResponse, setCommitResponse] = useState(null)

  const previewData = useMemo(() => getResponseData(previewResponse), [previewResponse])
  const previewToken = previewData?.preview_token || ''
  const previewSummary = previewData?.summary ?? {}
  const previewRows = normalizeRows(previewData?.rows)
  const visibleRows = previewRows.slice(0, 100)
  const hiddenRows = Math.max(0, previewRows.length - visibleRows.length)
  const commitData = useMemo(() => getResponseData(commitResponse), [commitResponse])
  const commitSummary = commitData?.summary ?? null
  const canCommit = Boolean(previewToken) && !isPreviewing && !isSubmitting && !commitResponse
  const isBusy = isPreviewing || isSubmitting || isCanceling

  const handleClose = async () => {
    if (isBusy) {
      return
    }

    if (previewToken && !commitResponse) {
      setIsCanceling(true)

      try {
        await api.itemData.imports.cancelPreview(previewToken)
      } catch (error) {
        console.error(error)
      } finally {
        setIsCanceling(false)
      }
    }

    onClose?.()
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isBusy])

  const handleCommit = async () => {
    if (!previewToken || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setDialogError('')

    try {
      const response = await api.itemData.imports.commit({
        preview_token: previewToken,
      })
      const data = getResponseData(response)

      setCommitResponse(response)
      onCommitted?.(data, response)

      if (data?.error_file_token) {
        const errorFile = await api.itemData.imports.errors(data.error_file_token)

        saveBlob(errorFile, errorFileName)
      }

      onClose?.()
    } catch (error) {
      setDialogError(error?.message || commitErrorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup parent-import-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-import-item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-import-item-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close item-create-popup__close-button"
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isBusy}
          >
            <XClose size={23} />
          </button>
        </div>

        <div className="dashboard-popup__body parent-import-popup__body">
          <div className="parent-import-file">
            <span className="parent-import-file__label">File</span>
            <strong className="parent-import-file__name">{fileName || '-'}</strong>
          </div>

          {isPreviewing ? (
            <div className="parent-import-state" role="status">
              Membuat preview import...
            </div>
          ) : errorMessage ? (
            <p className="parent-import-alert parent-import-alert--danger" role="alert">
              {errorMessage}
            </p>
          ) : previewData ? (
            <>
              <div className="parent-import-summary" aria-label="Import preview summary">
                <SummaryMetric label="Total" value={previewSummary.total} tone="info" />
                <SummaryMetric label="Valid" value={previewSummary.valid} tone="success" />
                <SummaryMetric label="Invalid" value={previewSummary.invalid} tone="danger" />
              </div>

              {previewData.expires_at ? (
                <p className="parent-import-expiry">
                  Preview berlaku sampai {formatDateTime(previewData.expires_at)}
                </p>
              ) : null}

              <div className="parent-import-table-shell">
                <table className="parent-import-table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Action</th>
                      <th>Status</th>
                      <th>Item</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length > 0 ? (
                      visibleRows.map((row, index) => {
                        const status = String(row?.status || '-').toUpperCase()
                        const statusTone = status === 'VALID' ? 'success' : 'danger'

                        return (
                          <tr key={`${row?.source_row ?? 'row'}-${index}`}>
                            <td>{row?.source_row ?? '-'}</td>
                            <td>{row?.action || '-'}</td>
                            <td>
                              <span className={`parent-import-status parent-import-status--${statusTone}`}>
                                {status}
                              </span>
                            </td>
                            <td>{getOriginalSummary(row?.original)}</td>
                            <td>{formatErrors(row?.errors)}</td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="parent-import-table__empty">
                          Tidak ada baris preview.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {hiddenRows > 0 ? (
                <p className="parent-import-expiry">
                  Menampilkan 100 baris pertama dari {formatNumber(previewRows.length)} baris.
                </p>
              ) : null}
            </>
          ) : (
            <div className="parent-import-state">Pilih file .xlsx untuk membuat preview import.</div>
          )}

          {commitSummary ? (
            <div className="parent-import-commit" role="status">
              <strong>Commit selesai</strong>
              <span>
                Success {formatNumber(commitSummary.success)} dari {formatNumber(commitSummary.total)} baris,
                failed {formatNumber(commitSummary.failed)}.
              </span>
              {commitData?.error_file_token ? (
                <span>File error sudah di-download otomatis.</span>
              ) : null}
            </div>
          ) : null}

          {dialogError ? (
            <p className="parent-import-alert parent-import-alert--danger" role="alert">
              {dialogError}
            </p>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={handleCommit}
            disabled={!canCommit}
          >
            {isSubmitting ? 'Committing...' : commitResponse ? 'Committed' : 'Commit'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogImportItem
