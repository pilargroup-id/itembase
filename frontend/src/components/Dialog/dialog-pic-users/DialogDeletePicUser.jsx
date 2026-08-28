import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'

function getPicUserDisplayName(picUser) {
  return picUser?.name || picUser?.pic_user_name || picUser?.code || picUser?.pic_user_code || 'this PIC user'
}

function getDeleteId(picUser) {
  return picUser?.id ?? picUser?.pic_user_id ?? null
}

function DialogDeletePicUser({
  isOpen = false,
  eyebrow = 'Delete Pic User',
  title = 'Delete Pic User',
  picUser = null,
  onClose,
  onDeleted,
  onConfirm,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const displayName = useMemo(() => getPicUserDisplayName(picUser), [picUser])
  const { notifySuccess } = useAlertAction()

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
    const deleteId = getDeleteId(picUser)

    if (!deleteId) {
      setErrorMessage('PIC User ID not found.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await api.picUsers.remove(deleteId)
      onDeleted?.(picUser)
      onConfirm?.(picUser)
      notifySuccess('PIC user deleted successfully.')
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to delete PIC user.')
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
        aria-labelledby="dialog-delete-pic-user-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-delete-pic-user-title">
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
            Are you sure you want to delete <strong>{displayName}</strong>?
          </p>
          <p className="dashboard-popup__text">
            This action will remove the PIC user data from the PIC user master.
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

export default DialogDeletePicUser
