import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import SearchableSelect from '../../dropdown/searchable-select/SearchableSelect.jsx'

const initialFormValues = {
  detail_category: '',
  sub_category: '',
  main_category: '',
  brand_category: '',
  pic_id: '',
  is_active: '1',
}

const categoriesFields = [
  {
    name: 'detail_category',
    label: 'Detail Category',
    placeholder: 'Enter Detail Category',
  },
  {
    name: 'sub_category',
    label: 'Sub Category',
    placeholder: 'Enter Sub Category',
  },
  {
    name: 'main_category',
    label: 'Main Category',
    placeholder: 'Enter Main Category',
  },
  {
    name: 'brand_category',
    label: 'Brand Category',
    placeholder: 'Enter Brand Category',
  },
]

function DialogCreateCategories({
  isOpen = false,
  eyebrow = 'Create Categories',
  title = 'Create Categories',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [picOptions, setPicOptions] = useState([])
  const [isLoadingPics, setIsLoadingPics] = useState(false)

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
    if (!isOpen) return

    let isMounted = true
    const fetchPics = async () => {
      setIsLoadingPics(true)
      try {
        const response = await api.directoryUsers.product()
        if (isMounted) {
          const data = Array.isArray(response) ? response : (response?.data || response?.rows || response?.results || [])
          setPicOptions(data)
        }
      } catch (error) {
        console.error('Failed to fetch PICs', error)
        if (isMounted) {
          setPicOptions([])
        }
      } finally {
        if (isMounted) {
          setIsLoadingPics(false)
        }
      }
    }

    fetchPics()

    return () => { isMounted = false }
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

  const picSelectOptions = picOptions.map((pic) => ({
    value: String(pic.id),
    label: pic.name || pic.username || pic.email || String(pic.id),
    searchText: [pic.name, pic.username, pic.email, pic.job_position].filter(Boolean).join(' '),
  }))

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handlePicChange = (nextValue) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      pic_id: nextValue,
    }))
  }

  const buildPayload = () => ({
    detail_category: formValues.detail_category.trim(),
    sub_category: formValues.sub_category.trim(),
    main_category: formValues.main_category.trim(),
    brand_category: formValues.brand_category.trim(),
    users: formValues.pic_id
      ? [{ central_user_id: formValues.pic_id, is_primary: 1 }]
      : [],
    is_active: Number(formValues.is_active),
  })

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.detail_category) {
      setErrorMessage('Please enter the detail category first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdCategories = await api.categories.create(payload)

      onCreated?.(createdCategories)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to create categories.')
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
        aria-labelledby="dialog-create-categories-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-categories-title">
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
                    <label className="register-user-popup__label" htmlFor="categories-pic-id">
                      PIC
                    </label>
                    <SearchableSelect
                      id="categories-pic-id"
                      label="PIC"
                      value={formValues.pic_id}
                      options={picSelectOptions}
                      placeholder="Select PIC"
                      searchPlaceholder="Search PIC..."
                      emptyMessage="PIC not found."
                      loading={isLoadingPics}
                      disabled={isSubmitting}
                      onChange={handlePicChange}
                    />
                  </div>

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

export default DialogCreateCategories
