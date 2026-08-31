import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

const initialFormValues = {
  name: '',
}

function getApiErrorMessage(error, fallbackMessage) {
  const errors = error?.data?.errors

  if (errors && typeof errors === 'object') {
    const firstError = Object.values(errors).find(Boolean)

    if (firstError) {
      return Array.isArray(firstError) ? firstError.join(', ') : String(firstError)
    }
  }

  return error?.message || fallbackMessage
}

function DialogCreateVariantAttributes({
  isOpen = false,
  eyebrow = 'Create Variant Attribute',
  title = 'Create Variant Attribute',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

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

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const buildPayload = () => {
    return {
      name: formValues.name.trim(),
      is_active: 1,
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.name) {
      setErrorMessage('Please complete the variant attribute name first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdAttribute = await api.variantAttributes.create(payload)

      onCreated?.(createdAttribute)
      notifySuccess('Variant attribute created successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to create variant attribute.'))
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
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup master-simple-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-variant-attribute-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-variant-attribute-title">
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
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="variant-attribute-name">
                      Name
                    </label>
                    <input
                      id="variant-attribute-name"
                      name="name"
                      className="register-user-popup__input"
                      value={formValues.name}
                      placeholder="Material"
                      onChange={handleInputChange}
                      maxLength={100}
                      disabled={isSubmitting}
                    />
                  </div>

                </div>
                <ValidationAlertBanner
                  message={errorMessage}
                  onDismiss={() => setErrorMessage('')}
                />
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

export default DialogCreateVariantAttributes
