import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'

const DEFAULT_COUNTRY_CODE = 'ID'

const initialFormValues = {
  name: '',
  is_active: '1',
}

const PortFields = [
  {
    name: 'name',
    label: 'Name',
    placeholder: 'Enter PORT..',
  },
]

function getPortId(Port) {
  return Port?.id ?? Port?.port_id ?? null
}

function getPortStatusValue(Port) {
  if (Port?.is_active !== undefined && Port?.is_active !== null) {
    return Number(Port.is_active) === 1 ? '1' : '0'
  }

  const normalizedStatus = String(Port?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return '1'
  }

  if (normalizedStatus === 'inactive') {
    return '0'
  }

  return '1'
}

function createFormValuesFromPort(Port) {
  if (!Port) {
    return initialFormValues
  }

  return {
    name: Port.name ?? Port.port_name ?? '',
    is_active: getPortStatusValue(Port),
  }
}

function DialogEditPort({
  isOpen = false,
  eyebrow = 'Edit Port',
  title = 'Edit Port',
  Port = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromPort(Port))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromPort(Port))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [Port])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromPort(Port))
  }, [Port])

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
    code: formValues.name.trim().slice(0, 50),
    name: formValues.name.trim(),
    country_code: Port?.country_code ?? DEFAULT_COUNTRY_CODE,
    is_active: Number(formValues.is_active),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.name) {
      setErrorMessage('Please complete the name for the Port first.')
      return
    }

    const PortId = getPortId(Port)

    if (!PortId) {
      setErrorMessage('Port ID not found.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedPort = await api.ports.update(PortId, payload)

      onEdited?.(editedPort, payload)
      notifySuccess('Port updated successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to update Port.')
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
        aria-labelledby="dialog-edit-port-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-port-title">
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
            {isSubmitting ? 'Saving...' : 'Edit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditPort
