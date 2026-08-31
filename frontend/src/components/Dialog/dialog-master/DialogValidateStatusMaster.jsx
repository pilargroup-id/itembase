import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../../template/TemplateIcons.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

function getEntityStatusValue(entity) {
  if (entity?.is_active !== undefined && entity?.is_active !== null) {
    return Number(entity.is_active) === 1 ? 1 : 0
  }

  const normalizedStatus = String(entity?.status ?? '').toLowerCase()

  return normalizedStatus === 'active' ? 1 : 0
}

function DialogValidateStatusMaster({
  isOpen = false,
  eyebrow = 'Validate Change Status',
  title = 'Validate Change Status',
  entity = null,
  displayName = 'this data',
  onClose,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const currentStatus = getEntityStatusValue(entity)
  const nextStatus = currentStatus === 1 ? 0 : 1
  const isActivating = nextStatus === 1

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return
    }

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
    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await onConfirm?.(entity, nextStatus)
    } catch (error) {
      setErrorMessage(
        error?.message ||
          `Failed to ${isActivating ? 'activate' : 'deactivate'} ${displayName}.`,
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
        aria-labelledby="dialog-status-master-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-status-master-title">
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
              ? 'The data will become active again and can be used.'
              : 'The data will be deactivated and will no longer be available for use.'}
          </p>
          <ValidationAlertBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage('')}
          />
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

export default DialogValidateStatusMaster
