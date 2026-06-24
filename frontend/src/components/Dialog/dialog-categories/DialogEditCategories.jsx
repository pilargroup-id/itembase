import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  code: '',
  name: '',
  is_active: '1',
}

const categoriesFields = [
  {
    name: 'code',
    label: 'Code',
    placeholder: 'GOTO',
  },
  {
    name: 'name',
    label: 'Name',
    placeholder: 'GOTO',
  },
]

function getCategoriesId(categories) {
  return categories?.id ?? categories?.category_id ?? null
}

function getCategoriesStatusValue(categories) {
  if (categories?.is_active !== undefined && categories?.is_active !== null) {
    return Number(categories.is_active) === 1 ? '1' : '0'
  }

  const normalizedStatus = String(categories?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return '1'
  }

  if (normalizedStatus === 'inactive') {
    return '0'
  }

  return '1'
}

function createFormValuesFromCategories(categories) {
  if (!categories) {
    return initialFormValues
  }

  return {
    code: categories.code ?? categories.category_code ?? '',
    name: categories.name ?? categories.category_name ?? '',
    is_active: getCategoriesStatusValue(categories),
  }
}

function DialogEditCategories({
  isOpen = false,
  eyebrow = 'Edit Categories',
  title = 'Edit Categories',
  categories = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromCategories(categories))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromCategories(categories))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [categories])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromCategories(categories))
  }, [categories])

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
      setErrorMessage('Lengkapi code dan name categories terlebih dahulu.')
      return
    }

    const categoriesId = getCategoriesId(categories)

    if (!categoriesId) {
      setErrorMessage('ID categories tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedCategories = await api.categories.update(categoriesId, payload)

      onEdited?.(editedCategories, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah categories.')
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
        aria-labelledby="dialog-edit-categories-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-categories-title">
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
                  {categoriesFields.map((field) => (
                    <div key={field.name} className="register-user-popup__field">
                      <label
                        className="register-user-popup__label"
                        htmlFor={`categories-${field.name}`}
                      >
                        {field.label}
                      </label>
                      <input
                        id={`categories-${field.name}`}
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
                    <label className="register-user-popup__label" htmlFor="categories-is-active">
                      Status
                    </label>
                    <select
                      id="categories-is-active"
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

export default DialogEditCategories
