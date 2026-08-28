import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'

const initialFormValues = {
  attribute_id: '',
  name: '',
  sort_order: '1',
}

function normalizeRows(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results
  }

  return []
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

function DialogCreateVariantValue({
  isOpen = false,
  eyebrow = 'Create Variant Value',
  title = 'Create Variant Value',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [attributeOptions, setAttributeOptions] = useState([])
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

  const sortedAttributeOptions = useMemo(
    () =>
      [...attributeOptions].sort((firstAttribute, secondAttribute) =>
        String(firstAttribute.name ?? '').localeCompare(String(secondAttribute.name ?? '')),
      ),
    [attributeOptions],
  )

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

    let isMounted = true

    const loadAttributes = async () => {
      setIsLoadingAttributes(true)
      setErrorMessage('')

      try {
        const response = await api.variantAttributes.list({ is_active: 1 })

        if (!isMounted) {
          return
        }

        setAttributeOptions(normalizeRows(response))
      } catch (error) {
        if (isMounted) {
          setAttributeOptions([])
          setErrorMessage(getApiErrorMessage(error, 'Failed to load variant attribute data.'))
        }
      } finally {
        if (isMounted) {
          setIsLoadingAttributes(false)
        }
      }
    }

    loadAttributes()

    return () => {
      isMounted = false
    }
  }, [isOpen])

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
    const payload = {
      attribute_id: formValues.attribute_id,
      name: formValues.name.trim(),
      sort_order: Number(formValues.sort_order),
      is_active: 1,
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.attribute_id || !payload.name) {
      setErrorMessage('Please complete the attribute and name for the variant value first.')
      return
    }

    if (!Number.isInteger(payload.sort_order) || payload.sort_order < 1) {
      setErrorMessage('Sort order must be a positive integer.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdValue = await api.variantValue.create(payload)

      onCreated?.(createdValue)
      notifySuccess('Variant value created successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to create variant value.'))
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
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-variant-value-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-variant-value-title">
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
                    <label className="register-user-popup__label" htmlFor="variant-value-attribute">
                      Attribute
                    </label>
                    <select
                      id="variant-value-attribute"
                      name="attribute_id"
                      className="register-user-popup__select"
                      value={formValues.attribute_id}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingAttributes}
                    >
                      <option value="">
                        {isLoadingAttributes ? 'Loading attributes...' : 'Select attribute'}
                      </option>
                      {sortedAttributeOptions.map((attribute) => (
                        <option key={attribute.id} value={attribute.id}>
                          {attribute.name || attribute.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="variant-value-name">
                      Name
                    </label>
                    <input
                      id="variant-value-name"
                      name="name"
                      className="register-user-popup__input"
                      value={formValues.name}
                      placeholder="Dark Blue"
                      onChange={handleInputChange}
                      maxLength={150}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="variant-value-sort-order">
                      Sort Order
                    </label>
                    <input
                      id="variant-value-sort-order"
                      name="sort_order"
                      type="number"
                      min="1"
                      step="1"
                      className="register-user-popup__input"
                      value={formValues.sort_order}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
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
            disabled={isSubmitting || isLoadingAttributes}
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateVariantValue
