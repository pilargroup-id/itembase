import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { FileText01, Upload01, XClose } from '../../template/TemplateIcons.jsx'
import ButtonDownloadParent from '../../button/parents-buttons/ButtonDownloadParent.jsx'

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

  const preferredKeys = ['parent_code', 'parent_name', 'item_name', 'brand_code']
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

function DialogImportParent({
  isOpen = false,
  eyebrow = 'Import Item Parent',
  title = 'Preview Import Parent',
  fileName = '',
  previewResponse = null,
  errorMessage = '',
  isPreviewing = false,
  onClose,
  onCommitted,
  onFileSelect,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [commitResponse, setCommitResponse] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef(null)

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
  const canSelectFile = !isBusy && !commitResponse

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

  const handleBrowseClick = () => {
    if (!canSelectFile) {
      return
    }

    fileInputRef.current?.click()
  }

  const handleFileInputChange = (event) => {
    const [file] = Array.from(event.target.files ?? [])

    if (file) {
      onFileSelect?.(file)
    }

    event.target.value = ''
  }

  const handleDragOver = (event) => {
    event.preventDefault()

    if (canSelectFile) {
      setIsDragActive(true)
    }
  }

  const handleDragLeave = (event) => {
    event.preventDefault()
    setIsDragActive(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setIsDragActive(false)

    if (!canSelectFile) {
      return
    }

    const [file] = Array.from(event.dataTransfer?.files ?? [])

    if (file) {
      onFileSelect?.(file)
    }
  }

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

        saveBlob(errorFile, 'item-parent-import-errors.xlsx')
      } else {
        onClose?.()
      }
    } catch (error) {
      setDialogError(error?.message || 'Failed to commit parent import.')
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
        aria-labelledby="dialog-import-parent-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-import-parent-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close item-create-popup__close-button"
            aria-label="Close dialog"
            onClick={handleClose}
            disabled={isBusy}
          >
            <XClose size={23} />
          </button>
        </div>

        <div className="dashboard-popup__body parent-import-popup__body">
          <div className="parent-import-template-actions">
            <div className="parent-import-template-hint">
              <span className="parent-import-template-hint__icon" aria-hidden="true">
                <FileText01 size={18} />
              </span>
              <span className="parent-import-template-hint__text">
                <strong>Use the official template</strong>
                <span>Download the template first so the data format matches before uploading.</span>
              </span>
            </div>
            <ButtonDownloadParent aria-label="Download item parent template" />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="parent-import-dropzone__input"
            onChange={handleFileInputChange}
            tabIndex={-1}
            aria-hidden="true"
          />

          {fileName ? (
            <div className="parent-import-file">
              <span className="parent-import-file__label">File</span>
              <strong className="parent-import-file__name">{fileName}</strong>
              {canSelectFile ? (
                <button
                  type="button"
                  className="parent-import-file__change"
                  onClick={handleBrowseClick}
                >
                  Change File
                </button>
              ) : null}
            </div>
          ) : (
            <div
              className={[
                'parent-import-dropzone',
                isDragActive ? 'parent-import-dropzone--active' : '',
                !canSelectFile ? 'parent-import-dropzone--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={canSelectFile ? 0 : -1}
              aria-disabled={!canSelectFile}
              onClick={handleBrowseClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleBrowseClick()
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload01 size={26} className="parent-import-dropzone__icon" aria-hidden="true" />
              <p className="parent-import-dropzone__title">
                Click to upload or drag &amp; drop a file here
              </p>
              <p className="parent-import-dropzone__hint">Format .xlsx</p>
            </div>
          )}

          {isPreviewing ? (
            <div className="parent-import-state" role="status">
              Building import preview...
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
                      <th>Parent</th>
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
                          No preview rows.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {hiddenRows > 0 ? (
                <p className="parent-import-expiry">
                  Showing the first 100 rows out of {formatNumber(previewRows.length)} rows.
                </p>
              ) : null}
            </>
          ) : null}

          {commitSummary ? (
            <div className="parent-import-commit" role="status">
              <strong>Commit complete</strong>
              <span>
                Success {formatNumber(commitSummary.success)} out of {formatNumber(commitSummary.total)} rows,
                failed {formatNumber(commitSummary.failed)}.
              </span>
              {commitData?.error_file_token ? (
                <span>Error file has been downloaded automatically.</span>
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

export default DialogImportParent
