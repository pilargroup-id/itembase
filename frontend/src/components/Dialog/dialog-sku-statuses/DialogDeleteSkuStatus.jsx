import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

function getSkuStatusDisplayName(skuStatus) {
  return skuStatus?.name || skuStatus?.sku_status_name || skuStatus?.code || skuStatus?.sku_status_code || 'sku status ini'
}

function getDeleteId(skuStatus) {
  return skuStatus?.id ?? skuStatus?.sku_status_id ?? null
}

function DialogDeleteSkuStatus({
  isOpen = false,
  eyebrow = 'Delete SKU Status',
  title = 'Delete SKU Status',
  skuStatus = null,
  onClose,
  onDeleted,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const displayName = useMemo(() => getSkuStatusDisplayName(skuStatus), [skuStatus])

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(false)
    setErrorMessage('')
    onClose?.()
  }, [isSubmitting, onClose])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, isSubmitting])

  const handleDelete = async () => {
    const deleteId = getDeleteId(skuStatus)

    if (!deleteId) {
      setErrorMessage('ID sku status tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await api.skuStatuses.remove(deleteId)
      onDeleted?.(skuStatus)
      onConfirm?.(skuStatus)
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal menghapus sku status.')
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
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-delete-sku-status-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-delete-sku-status-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Apakah Anda yakin ingin menghapus <strong>{displayName}</strong>?
          </p>
          <p className="dashboard-popup__text">
            Tindakan ini akan menghapus data sku status dari master sku statuses.
          </p>
          {errorMessage ? (
            <p className="register-user-popup__hint" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--danger"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogDeleteSkuStatus
