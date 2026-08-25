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
    'this item'
  )
}

function getItemId(item, user) {
  return item?.id ?? user?.id ?? null
}

function getItemStatusValue(item) {
  if (item?.is_active !== undefined && item?.is_active !== null) {
    return Number(item.is_active) === 1 ? 1 : 0
  }

  const normalizedStatus = String(item?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return 1
  }

  if (normalizedStatus === 'inactive') {
    return 0
  }

  return 0
}

function getSanitizedProductionTimeDays(item) {
  const rawValue = item?.production_time_days

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return undefined
  }

  const numericValue = Math.round(Number(rawValue))

  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : undefined
}

function DialogValidateStatusBundle({
  isOpen = false,
  eyebrow = 'Validate Change Status',
  title = 'Validate Change Status',
  item = null,
  parent = null,
  user = null,
  onClose,
  onChanged,
}) {
  const selectedItem = item ?? parent
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const displayName = useMemo(
    () => getItemDisplayName(selectedItem, user),
    [selectedItem, user],
  )
  const currentStatus = getItemStatusValue(selectedItem)
  const nextStatus = currentStatus === 1 ? 0 : 1
  const isActivating = nextStatus === 1

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

  const handleConfirm = async () => {
    const itemId = getItemId(selectedItem, user)

    if (!itemId) {
      setErrorMessage('Item ID not found.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    const productionTimeDays = getSanitizedProductionTimeDays(selectedItem)

    try {
      await api.items.updateStatus(
        itemId,
        nextStatus,
        productionTimeDays === undefined ? {} : { production_time_days: productionTimeDays },
      )
      onChanged?.(selectedItem ?? user, nextStatus)
    } catch (error) {
      setErrorMessage(
        error?.message ||
          `Failed to ${isActivating ? 'activate' : 'deactivate'} item.`,
      )
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
        aria-labelledby="dialog-status-item-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-status-item-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Close dialog"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Are you sure you want to {isActivating ? 'activate' : 'deactivate'}{' '}
            <strong>{displayName}</strong>?
          </p>
          <p className="dashboard-popup__text">
            {isActivating
              ? 'The item will reappear in the active item list and can be used again.'
              : 'The item will be deactivated and will no longer appear in the active item list.'}
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
            Cancel
          </button>
          <button
            type="button"
            className={`dashboard-popup__button ${
              isActivating
                ? 'dashboard-popup__button--primary'
                : 'dashboard-popup__button--danger'
            }`}
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : isActivating
                ? 'Activate'
                : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogValidateStatusBundle
