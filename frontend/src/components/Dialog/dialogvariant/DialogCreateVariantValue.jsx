import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

const initialFormValues = {
  attribute_id: '',
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

function getResourceData(responseData) {
  return responseData?.data && !Array.isArray(responseData.data)
    ? responseData.data
    : responseData
}

function getVariantValueName(variantValue) {
  return String(
    variantValue?.name ??
      variantValue?.value_name ??
      variantValue?.variant_value ??
      variantValue?.uom_name ??
      variantValue?.label ??
      variantValue?.code ??
      variantValue?.uom_code ??
      '',
  ).trim()
}

function getSortOrder(variantValue) {
  const sortOrder = Number(variantValue?.sort_order)

  return Number.isFinite(sortOrder) ? sortOrder : 0
}

function getNextSortOrder(variantValues) {
  const maxSortOrder = variantValues.reduce(
    (currentMax, variantValue, index) =>
      Math.max(currentMax, getSortOrder(variantValue), index + 1),
    0,
  )

  return maxSortOrder + 1
}

function normalizeComparisonKey(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

function parseVariantValueNames(value) {
  const usedNames = new Set()

  return String(value ?? '')
    .split(/[\n,;]+/)
    .map((name) => name.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .filter((name) => {
      const comparisonKey = normalizeComparisonKey(name)

      if (usedNames.has(comparisonKey)) {
        return false
      }

      usedNames.add(comparisonKey)
      return true
    })
}

function buildVariantValuePayloads(names, attributeId, sortOrderStart) {
  return names.map((name, index) => ({
    attribute_id: attributeId,
    name,
    sort_order: sortOrderStart + index,
    is_active: 1,
  }))
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
  const [variantValueNames, setVariantValueNames] = useState([])
  const [nameDraft, setNameDraft] = useState('')
  const [attributeOptions, setAttributeOptions] = useState([])
  const [variantValueOptions, setVariantValueOptions] = useState([])
  const [isLoadingAttributes, setIsLoadingAttributes] = useState(false)
  const [isLoadingVariantValues, setIsLoadingVariantValues] = useState(false)
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

  const sortedVariantValueOptions = useMemo(
    () =>
      [...variantValueOptions].sort((firstValue, secondValue) =>
        getVariantValueName(firstValue).localeCompare(getVariantValueName(secondValue)),
      ),
    [variantValueOptions],
  )

  const existingNameKeySet = useMemo(
    () =>
      new Set(
        variantValueOptions.map((variantValue) =>
          normalizeComparisonKey(getVariantValueName(variantValue)),
        ),
      ),
    [variantValueOptions],
  )

  const combinedVariantValueNames = useMemo(() => {
    const draftNames = parseVariantValueNames(nameDraft)

    if (draftNames.length === 0) {
      return variantValueNames
    }

    const usedKeys = new Set(variantValueNames.map(normalizeComparisonKey))
    const additions = draftNames.filter((name) => !usedKeys.has(normalizeComparisonKey(name)))

    return [...variantValueNames, ...additions]
  }, [variantValueNames, nameDraft])

  const decoratedVariantValueNames = useMemo(
    () =>
      variantValueNames.map((name) => ({
        name,
        isExisting: existingNameKeySet.has(normalizeComparisonKey(name)),
      })),
    [variantValueNames, existingNameKeySet],
  )

  const newVariantValueNames = useMemo(
    () =>
      combinedVariantValueNames.filter(
        (name) => !existingNameKeySet.has(normalizeComparisonKey(name)),
      ),
    [combinedVariantValueNames, existingNameKeySet],
  )

  const existingVariantValueNames = useMemo(
    () =>
      combinedVariantValueNames.filter((name) =>
        existingNameKeySet.has(normalizeComparisonKey(name)),
      ),
    [combinedVariantValueNames, existingNameKeySet],
  )

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setVariantValueNames([])
    setNameDraft('')
    setVariantValueOptions([])
    setIsLoadingVariantValues(false)
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

    let isMounted = true
    const controller = new AbortController()
    const attributeId = formValues.attribute_id

    const loadVariantValues = async () => {
      if (!attributeId) {
        setVariantValueOptions([])
        setIsLoadingVariantValues(false)
        return
      }

      setIsLoadingVariantValues(true)
      setErrorMessage('')

      try {
        const response = await api.variants.values(
          { attribute_id: attributeId, is_active: 1 },
          { signal: controller.signal },
        )
        const rows = normalizeRows(response)

        if (!isMounted) {
          return
        }

        setVariantValueOptions(rows)
        setFormValues((currentValues) =>
          currentValues.attribute_id === attributeId
            ? {
                ...currentValues,
                sort_order: String(getNextSortOrder(rows)),
              }
            : currentValues,
        )
      } catch (error) {
        if (isMounted && error?.name !== 'AbortError') {
          setVariantValueOptions([])
          setErrorMessage(getApiErrorMessage(error, 'Failed to load variant value data.'))
        }
      } finally {
        if (isMounted) {
          setIsLoadingVariantValues(false)
        }
      }
    }

    loadVariantValues()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [formValues.attribute_id, isOpen])

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

  const addVariantValueNames = useCallback((rawText) => {
    const parsedNames = parseVariantValueNames(rawText)

    if (parsedNames.length === 0) {
      return
    }

    setVariantValueNames((currentNames) => {
      const usedKeys = new Set(currentNames.map(normalizeComparisonKey))
      const additions = parsedNames.filter((name) => !usedKeys.has(normalizeComparisonKey(name)))

      return [...currentNames, ...additions]
    })
    setErrorMessage('')
  }, [])

  const handleNameDraftChange = (event) => {
    setNameDraft(event.target.value)
  }

  const handleNameDraftKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === 'Tab') {
      if (!nameDraft.trim()) {
        return
      }

      event.preventDefault()
      addVariantValueNames(nameDraft)
      setNameDraft('')
      return
    }

    if (event.key === 'Backspace' && !nameDraft) {
      setVariantValueNames((currentNames) => currentNames.slice(0, -1))
    }
  }

  const handleNameDraftBlur = () => {
    if (nameDraft.trim()) {
      addVariantValueNames(nameDraft)
      setNameDraft('')
    }
  }

  const handleNameDraftPaste = (event) => {
    const pastedText = event.clipboardData?.getData('text') ?? ''

    if (!/[\n,;]/.test(pastedText)) {
      return
    }

    event.preventDefault()
    addVariantValueNames(`${nameDraft}${pastedText}`)
    setNameDraft('')
  }

  const handleRemoveVariantValueName = (nameToRemove) => {
    setVariantValueNames((currentNames) => currentNames.filter((name) => name !== nameToRemove))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const allNames = combinedVariantValueNames

    if (allNames.length !== variantValueNames.length) {
      setVariantValueNames(allNames)
      setNameDraft('')
    }

    if (!formValues.attribute_id || allNames.length === 0) {
      setErrorMessage('Please select an attribute and add at least one variant value name.')
      return
    }

    const sortOrderStart = Number(formValues.sort_order)

    if (!Number.isInteger(sortOrderStart) || sortOrderStart < 1) {
      setErrorMessage('Sort order must be a positive integer.')
      return
    }

    const namesToCreate = newVariantValueNames
    const skippedCount = existingVariantValueNames.length

    if (namesToCreate.length === 0) {
      setErrorMessage('All entered variant values already exist for this attribute.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payloads = buildVariantValuePayloads(
        namesToCreate,
        formValues.attribute_id,
        sortOrderStart,
      )
      const createdValues = await Promise.all(
        payloads.map((payload) => api.variantValue.create(payload)),
      )
      const createdRows = createdValues.map(getResourceData)

      onCreated?.(createdRows.length === 1 ? createdRows[0] : createdRows)
      notifySuccess(
        skippedCount > 0
          ? `${createdRows.length} variant value created. ${skippedCount} existing value skipped.`
          : `${createdRows.length} variant value created successfully.`,
      )
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

  const isTagFieldDisabled = isSubmitting
  const submitLabel = isSubmitting
    ? 'Creating...'
    : combinedVariantValueNames.length > 0
      ? `Create ${combinedVariantValueNames.length} Value${combinedVariantValueNames.length > 1 ? 's' : ''}`
      : 'Create'

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup variant-value-create-popup"
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
                    <label className="register-user-popup__label" htmlFor="variant-value-sort-order">
                      Starting Sort Order
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

                  {formValues.attribute_id && (
                    <div className="register-user-popup__field register-user-popup__field--full">
                      <span className="register-user-popup__label">Existing Values For This Attribute</span>
                      {isLoadingVariantValues ? (
                        <p className="register-user-popup__hint">Loading existing variant values...</p>
                      ) : sortedVariantValueOptions.length > 0 ? (
                        <div className="variant-value-existing-list">
                          {sortedVariantValueOptions.map((variantValue) => (
                            <span
                              key={variantValue.id ?? getVariantValueName(variantValue)}
                              className="master-project-chip"
                            >
                              {getVariantValueName(variantValue)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="register-user-popup__hint">
                          No existing variant values for this attribute yet.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="register-user-popup__field register-user-popup__field--full">
                    <label className="register-user-popup__label" htmlFor="variant-value-name-input">
                      Value Names
                    </label>
                    <div
                      className={`variant-value-tag-field${isTagFieldDisabled ? ' variant-value-tag-field--disabled' : ''}`}
                      onClick={() => document.getElementById('variant-value-name-input')?.focus()}
                    >
                      {decoratedVariantValueNames.map((entry) => (
                        <span
                          key={entry.name}
                          className={`variant-value-tag${entry.isExisting ? ' variant-value-tag--existing' : ''}`}
                        >
                          {entry.name}
                          {entry.isExisting ? ' · exists' : ''}
                          <button
                            type="button"
                            className="variant-value-tag__remove"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleRemoveVariantValueName(entry.name)
                            }}
                            disabled={isSubmitting}
                            aria-label={`Remove ${entry.name}`}
                          >
                            <XClose size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        id="variant-value-name-input"
                        className="variant-value-tag-field__input"
                        value={nameDraft}
                        placeholder={
                          decoratedVariantValueNames.length === 0
                            ? 'Dark Blue, Light Blue, Navy...'
                            : 'Add another value'
                        }
                        onChange={handleNameDraftChange}
                        onKeyDown={handleNameDraftKeyDown}
                        onBlur={handleNameDraftBlur}
                        onPaste={handleNameDraftPaste}
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="register-user-popup__hint">
                      Press Enter or comma to add a value. You can also paste a list separated by
                      commas or new lines.
                    </p>
                    {existingVariantValueNames.length > 0 && (
                      <p className="register-user-popup__hint register-user-popup__hint--warning" role="alert">
                        Already exists and will be skipped: {existingVariantValueNames.join(', ')}
                      </p>
                    )}
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
            disabled={
              isSubmitting ||
              isLoadingAttributes ||
              isLoadingVariantValues ||
              !formValues.attribute_id ||
              combinedVariantValueNames.length === 0
            }
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateVariantValue
