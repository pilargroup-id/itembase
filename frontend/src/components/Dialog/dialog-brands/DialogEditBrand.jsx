import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  code: '',
  name: '',
  is_active: '1',
}

const brandFields = [
  {
    name: 'code',
    label: 'Code',
    placeholder: 'e.g., GOTO',
  },
  {
    name: 'name',
    label: 'Name',
    placeholder: 'e.g., GOTO',
  },
]

function getBrandId(brand) {
  return brand?.id ?? brand?.brand_id ?? null
}

function getBrandStatusValue(brand) {
  if (brand?.is_active !== undefined && brand?.is_active !== null) {
    return Number(brand.is_active) === 1 ? '1' : '0'
  }

  const normalizedStatus = String(brand?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return '1'
  }

  if (normalizedStatus === 'inactive') {
    return '0'
  }

  return '1'
}

function createFormValuesFromBrand(brand) {
  if (!brand) {
    return initialFormValues
  }

  return {
    code: brand.code ?? brand.brand_code ?? '',
    name: brand.name ?? brand.brand_name ?? '',
    is_active: getBrandStatusValue(brand),
  }
}

function DialogEditBrand({
  isOpen = false,
  eyebrow = 'Edit Brand',
  title = 'Edit Brand',
  brand = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromBrand(brand))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromBrand(brand))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [brand])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromBrand(brand))
  }, [brand])

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
    code: formValues.code.trim(),
    name: formValues.name.trim(),
    is_active: Number(formValues.is_active),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.code || !payload.name) {
      setErrorMessage('Lengkapi code dan name brand terlebih dahulu.')
      return
    }

    const brandId = getBrandId(brand)

    if (!brandId) {
      setErrorMessage('ID brand tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedBrand = await api.brands.update(brandId, payload)

      onEdited?.(editedBrand, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah brand.')
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
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-brand-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-brand-title">
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
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="register-user-popup__grid">
                  {brandFields.map((field) => (
                    <div key={field.name} className="register-user-popup__field">
                      <label
                        className="register-user-popup__label"
                        htmlFor={`brand-${field.name}`}
                      >
                        {field.label}
                      </label>
                      <input
                        id={`brand-${field.name}`}
                        name={field.name}
                        className="register-user-popup__input"
                        value={formValues[field.name]}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="brand-is-active">
                      Status
                    </label>
                    <select
                      id="brand-is-active"
                      name="is_active"
                      className="register-user-popup__select"
                      value={formValues.is_active}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                    >
                      <option value="1">active</option>
                      <option value="0">inactive</option>
                    </select>
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
            Batal
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

export default DialogEditBrand
