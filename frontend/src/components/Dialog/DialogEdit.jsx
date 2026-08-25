import { useEffect } from 'react'
import { createPortal } from 'react-dom'

import { XClose } from '../template/TemplateIcons.jsx'

function DialogEdit({
  isOpen = false,
  eyebrow = 'Edit Data',
  title = 'Edit Data',
  user = null,
  onClose,
  onConfirm,
}) {
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

  if (!isOpen) {
    return null
  }

  if (typeof document === 'undefined') {
    return null
  }

  const hasUserMeta = Boolean(user?.department || user?.role)

  const dialogNode = (
    <div className="dashboard-popup-overlay" role="presentation" onClick={onClose}>
      <div
        className="dashboard-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Data for <strong>{user?.name ?? 'this item'}</strong> is ready to be opened for editing.
          </p>
          {hasUserMeta ? (
            <p className="dashboard-popup__text">
              Department: {user.department} | Role: {user.role}
            </p>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={() => onConfirm?.(user)}
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEdit
