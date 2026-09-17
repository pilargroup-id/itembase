import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

const DEFAULT_COUNTRY_CODE = 'ID'

const COUNTRY_CODE_OPTIONS = ['ID', 'CN']

const initialFormValues = {
  name: '',
  code: '',
  country_code: DEFAULT_COUNTRY_CODE,
  is_active: '1',
}

const PortFields = [
  {
    name: 'name',
    label: 'Name',
    placeholder: 'Enter Port..',
  },
  {
    name: 'code',
    label: 'Code',
    placeholder: 'Enter Code..',
  },
]

function DialogCreatePort({
  isOpen = false,
  eyebrow = 'Create Port',
  title = 'Create Port',
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

  const buildPayload = () => ({
    code: formValues.code.trim().slice(0, 50),
    name: formValues.name.trim(),
    country_code: formValues.country_code,
    is_active: Number(formValues.is_active),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.name) {
      setErrorMessage('Please complete the name for the Port first.')
      return
    }

    if (!payload.code) {
      setErrorMessage('Please complete the code for the Port first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdPort = await api.ports.create(payload)

      onCreated?.(createdPort)
      notifySuccess('Port created successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to create Port.')
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
        className="dashboard-popup register-user-popup master-simple-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-Port-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-Port-title">
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
                    <label
                      className="register-user-popup__label"
                      htmlFor="Port-country_code"
                    >
                      Country Code
                    </label>
                    <select
                      id="Port-country_code"
                      name="country_code"
                      className="register-user-popup__select"
                      value={formValues.country_code}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      {COUNTRY_CODE_OPTIONS.map((code) => (
                        <option key={code} value={code}>
                          {code}
                        </option>
                      ))}
                    </select>
                  </div>
                  {PortFields.map((field) => (
                    <div
                      key={field.name}
                      className="register-user-popup__field register-user-popup__field--full"
                    >
                      <label
                        className="register-user-popup__label"
                        htmlFor={`Port-${field.name}`}
                      >
                        {field.label}
                      </label>
                      <input
                        id={`Port-${field.name}`}
                        name={field.name}
                        className="register-user-popup__input"
                        value={formValues[field.name]}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}
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

export default DialogCreatePort
