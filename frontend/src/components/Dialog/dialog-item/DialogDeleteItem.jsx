import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

function getItemDisplayName(item, user) {
  return (
    item?.item_name ||
    item?.item_code ||
    item?.barcode ||
    user?.name ||
    'item ini'
  )
}

function getDeleteId(item, user) {
  return item?.id ?? user?.id ?? null
}

function DialogDeleteItem({
  isOpen = false,
  eyebrow = 'Delete Item',
  title = 'Delete Item',
  item = null,
  parent = null,
  user = null,
  onClose,
  onDeleted,
  onConfirm,
}) {
  const selectedItem = item ?? parent
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const displayName = useMemo(
    () => getItemDisplayName(selectedItem, user),
    [selectedItem, user],
  )

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
    const deleteId = getDeleteId(selectedItem, user)

    if (!deleteId) {
      setErrorMessage('ID item tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await api.items.update(deleteId, { is_active: 0 })
      onDeleted?.(selectedItem ?? user)
      onConfirm?.(selectedItem ?? user)
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal menghapus item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
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
        aria-labelledby="dialog-delete-item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-delete-item-title">
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
            Tindakan ini akan menonaktifkan item dari daftar aktif.
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

export default DialogDeleteItem
