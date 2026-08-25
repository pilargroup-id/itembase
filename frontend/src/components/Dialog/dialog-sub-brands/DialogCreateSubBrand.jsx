import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  name: '',
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseErrors = error?.data?.errors

  if (responseErrors && typeof responseErrors === 'object' && !Array.isArray(responseErrors)) {
    const fieldMessage = Object.values(responseErrors).find(
      (value) => typeof value === 'string' && value.trim(),
    )

    if (fieldMessage) {
      return fieldMessage
    }
  }

  return error?.message || fallbackMessage
}

function DialogCreateSubBrand({
  isOpen = false,
  eyebrow = 'Sub Brand',
  title = 'Create Sub Brand',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

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

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setErrorMessage('')
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = formValues.name.trim()

    if (!name) {
      setErrorMessage('Please enter the sub brand name first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdSubBrand = await api.subBrands.create({ name })

      onCreated?.(createdSubBrand)
      handleClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to create sub brand.'))
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
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup sub-brand-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-sub-brand-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-sub-brand-title">
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
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="register-user-popup__grid">
                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label className="register-user-popup__label" htmlFor="sub-brand-name">
                      Name
                    </label>
                    <input
                      id="sub-brand-name"
                      name="name"
                      className="register-user-popup__input"
                      value={formValues.name}
                      placeholder="Input Sub Brand Name"
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                </div>
                {errorMessage ? (
                  <p className="register-user-popup__hint" role="alert">
                    {errorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
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
            type="submit"
            className="dashboard-popup__button dashboard-popup__button--primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateSubBrand
