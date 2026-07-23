import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { Minus, Plus, Trash03, XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableBundleSelect.jsx'

const BUNDLE_MIN_COMPONENTS = 2
const BUNDLE_MAX_COMPONENTS = 5

const initialFormValues = {
  uom_id: '',
  is_active: '1',
}

const initialComponent = () => ({ component_item_id: '', qty: '' })

const bundleFields = [
  {
    name: 'uom_id',
    label: 'UOM',
    placeholder: 'Pilih UOM',
    type: 'select',
    optionsKey: 'uoms',
    searchPlaceholder: 'Cari UOM...',
    emptyMessage: 'UOM tidak ditemukan.',
    required: true,
  },
]

const numericFields = new Set(['is_active'])
const integerInputFields = new Set()

const emptyMasterOptions = {
  uoms: [],
  regularItems: [],
}

function normalizeListResponse(responseData) {
  if (Array.isArray(responseData)) {
    return responseData
  }

  if (Array.isArray(responseData?.data)) {
    return responseData.data
  }

  if (Array.isArray(responseData?.data?.data)) {
    return responseData.data.data
  }

  if (Array.isArray(responseData?.data?.rows)) {
    return responseData.data.rows
  }

  if (Array.isArray(responseData?.data?.results)) {
    return responseData.data.results
  }

  if (Array.isArray(responseData?.rows)) {
    return responseData.rows
  }

  if (Array.isArray(responseData?.results)) {
    return responseData.results
  }

  return []
}

function makeOption(value, labelParts) {
  const label = labelParts.find(Boolean)

  return {
    value: String(value ?? ''),
    label: label || String(value ?? ''),
    searchText: [...labelParts, value].filter(Boolean).join(' '),
  }
}

function normalizeMasterOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((item) => makeOption(item.id ?? item.value, [item.name, item.code]))
    .filter((option) => option.value && option.label)
}

function normalizeRegularItemOptions(responseData) {
  return normalizeListResponse(responseData)
    .filter((item) => item.item_kind === 'regular')
    .map((item) =>
      makeOption(item.id, [
        item.item_name || item.item_code,
        item.item_code,
        item.barcode,
      ]),
    )
    .filter((option) => option.value && option.label)
}

function sanitizeIntegerInput(value) {
  return String(value ?? '').replace(/[^\d]/g, '')
}

function isPositiveInteger(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!/^\d+$/.test(normalizedValue)) {
    return false
  }

  const numberValue = Number(normalizedValue)

  return Number.isSafeInteger(numberValue) && numberValue > 0
}

function getOptionLabel(options, value) {
  const normalizedValue = String(value ?? '')
  const option = options.find((currentOption) => currentOption.value === normalizedValue)

  return option?.label ?? ''
}

function buildBundleFormulaPreview(components, regularItems) {
  const formulaParts = components
    .map((component) => {
      const itemLabel = getOptionLabel(regularItems, component.component_item_id)
      const qty = String(component.qty ?? '').trim()

      if (!itemLabel) {
        return ''
      }

      return qty ? `${qty} ${itemLabel}` : itemLabel
    })
    .filter(Boolean)

  return formulaParts.length > 0 ? `BUNDLE ${formulaParts.join(' + ')}` : ''
}

function buildPayload(formValues, components) {
  const payload = Object.fromEntries(
    Object.entries(formValues)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value]
        }

        const trimmedValue = String(value ?? '').trim()

        if (trimmedValue === '') {
          return [key, '']
        }

        return [key, numericFields.has(key) ? Number(trimmedValue) : trimmedValue]
      })
      .filter(([, value]) => value !== ''),
  )

  payload.item_kind = 'bundle'

  const validComponents = components
    .filter((component) => component.component_item_id && isPositiveInteger(component.qty))
    .map((component, index) => ({
      component_item_id: component.component_item_id,
      qty: Number(component.qty),
      sort_order: index + 1,
    }))

  if (validComponents.length > 0) {
    payload.components = validComponents
  }

  return payload
}

function hasRequiredValues(payload, components) {
  if (!payload.item_kind || !payload.uom_id) {
    return false
  }

  const validComponents = components.filter(
    (component) => component.component_item_id && isPositiveInteger(component.qty),
  )

  return (
    validComponents.length >= BUNDLE_MIN_COMPONENTS &&
    validComponents.length <= BUNDLE_MAX_COMPONENTS
  )
}

function DialogCreateBundle({
  isOpen = false,
  eyebrow = 'Create Bundle',
  title = 'Preview Bundle',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [components, setComponents] = useState([initialComponent(), initialComponent()])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')

  const bundleFormulaPreview = useMemo(
    () => buildBundleFormulaPreview(components, masterOptions.regularItems),
    [components, masterOptions.regularItems],
  )
  const dialogTitle = bundleFormulaPreview || title

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setComponents([initialComponent(), initialComponent()])
    setIsSubmitting(false)
    setMasterOptions(emptyMasterOptions)
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
    const controller = new AbortController()

    const loadMasterOptions = async () => {
      setIsLoadingMasters(true)

      try {
        const [uoms, items] = await Promise.all([
          api.uoms.list({ is_active: 1 }, { signal: controller.signal }),
          api.items.list({ item_kind: 'regular' }, { signal: controller.signal }),
        ])

        if (!isMounted) {
          return
        }

        setMasterOptions({
          uoms: normalizeMasterOptions(uoms),
          regularItems: normalizeRegularItemOptions(items),
        })
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
        setErrorMessage(error?.message || 'Gagal memuat data master bundle.')
      } finally {
        if (isMounted) {
          setIsLoadingMasters(false)
        }
      }
    }

    loadMasterOptions()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isOpen])

  const handleFieldChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const normalizedValue = integerInputFields.has(name)
      ? sanitizeIntegerInput(value)
      : value

    handleFieldChange(name, normalizedValue)
  }

  const handleComponentChange = (index, field, value) => {
    const normalizedValue = field === 'qty' ? sanitizeIntegerInput(value) : value

    setErrorMessage('')
    setComponents((currentComponents) =>
      currentComponents.map((component, currentIndex) =>
        currentIndex === index
          ? { ...component, [field]: normalizedValue }
          : component,
      ),
    )
  }

  const handleAddComponent = () => {
    if (components.length < BUNDLE_MAX_COMPONENTS) {
      setComponents((current) => [...current, initialComponent()])
    }
  }

  const handleRemoveComponent = (index) => {
    if (components.length > BUNDLE_MIN_COMPONENTS) {
      setComponents((current) => current.filter((_, currentIndex) => currentIndex !== index))
    }
  }

  const handleQtyStep = (index, direction) => {
    setErrorMessage('')
    setComponents((currentComponents) =>
      currentComponents.map((component, currentIndex) => {
        if (currentIndex !== index) {
          return component
        }

        const currentQty = Number(component.qty) || 0
        const nextQty = Math.max(1, currentQty + direction)

        return { ...component, qty: String(nextQty) }
      }),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload(formValues, components)

    if (!hasRequiredValues(payload, components)) {
      setErrorMessage(
        `Lengkapi UOM dan minimal ${BUNDLE_MIN_COMPONENTS} component item dengan qty angka bulat.`,
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdItem = await api.items.create(payload)

      onCreated?.(createdItem)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal membuat bundle.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const renderField = (field) => (
    <div
      key={field.name}
      className={`register-user-popup__field${
        field.full ? ' register-user-popup__field--full' : ''
      }`}
    >
      <label className="register-user-popup__label" htmlFor={`bundle-${field.name}`}>
        {field.label}
        {field.required ? <span style={{ color: 'red', marginLeft: '4px' }}>*</span> : null}
      </label>
      {field.type === 'select' ? (
        <SearchableItemSelect
          id={`bundle-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters}
          onChange={(nextValue) => handleFieldChange(field.name, nextValue)}
        />
      ) : (
        <input
          id={`bundle-${field.name}`}
          name={field.name}
          className="register-user-popup__input"
          type="text"
          inputMode={field.type === 'number' ? 'numeric' : undefined}
          pattern={field.type === 'number' ? '[0-9]*' : undefined}
          value={formValues[field.name]}
          placeholder={field.placeholder}
          onChange={handleInputChange}
          disabled={isSubmitting}
        />
      )}
    </div>
  )

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup item-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-bundle-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-bundle-title">
              {dialogTitle}
            </h2>
          </div>

          <XClose
            className="bundle-create-popup__close-icon"
            size={23}
            role="button"
            tabIndex={isSubmitting ? -1 : 0}
            aria-label="Tutup dialog"
            onClick={() => {
              if (!isSubmitting) {
                handleClose()
              }
            }}
            onKeyDown={(event) => {
              if (!isSubmitting && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                handleClose()
              }
            }}
            aria-disabled={isSubmitting}
          />
        </div>

        <div className="dashboard-popup__body">
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="parent-create-popup__section">
                  <div className="register-user-popup__grid bundle-create-popup__meta-grid">
                    {bundleFields.map(renderField)}
                  </div>
                </div>

                <div className="parent-create-popup__section bundle-create-popup__items-backdrop">
                  <div className="bundle-create-popup__section-top">
                    <div className="parent-create-popup__section-header">
                      <h3 className="parent-create-popup__section-title">Daftar Item Bundle</h3>
                      <p className="parent-create-popup__section-description">
                        Tambahkan minimal {BUNDLE_MIN_COMPONENTS} item regular. Qty hanya bisa angka bulat tanpa koma.
                      </p>
                    </div>

                    <div className="bundle-create-popup__section-actions">
                      <span className="bundle-create-popup__count">
                        {components.length}/{BUNDLE_MAX_COMPONENTS} item
                      </span>
                    </div>
                  </div>

                  <div className="bundle-create-popup__components">
                    {components.map((component, index) => (
                      <div
                        key={`component-${index}`}
                        className="bundle-create-popup__component-card"
                      >
                        <div className="bundle-create-popup__component-grid">
                          <div className="register-user-popup__field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`bundle-component-item-${index}`}
                            >
                              Item Regular
                              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                            </label>
                            <SearchableItemSelect
                              id={`bundle-component-item-${index}`}
                              label={`Component item ${index + 1}`}
                              value={component.component_item_id}
                              options={masterOptions.regularItems}
                              placeholder="Pilih regular item..."
                              searchPlaceholder="Cari item..."
                              emptyMessage="Item tidak ditemukan."
                              loading={isLoadingMasters}
                              disabled={isSubmitting || isLoadingMasters}
                              onChange={(nextValue) =>
                                handleComponentChange(index, 'component_item_id', nextValue)
                              }
                            />
                          </div>

                          <div className="register-user-popup__field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`bundle-component-qty-${index}`}
                            >
                              Qty
                              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                            </label>
                            <div className="bundle-create-popup__qty-control">
                              <button
                                type="button"
                                className="bundle-create-popup__qty-button"
                                onClick={() => handleQtyStep(index, -1)}
                                disabled={isSubmitting || Number(component.qty) <= 1}
                                title="Kurangi qty"
                                aria-label={`Kurangi qty item bundle ${index + 1}`}
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                id={`bundle-component-qty-${index}`}
                                className="register-user-popup__input bundle-create-popup__qty-input"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={component.qty}
                                placeholder="0"
                                onChange={(event) =>
                                  handleComponentChange(index, 'qty', event.target.value)
                                }
                                disabled={isSubmitting}
                              />
                              <button
                                type="button"
                                className="bundle-create-popup__qty-button"
                                onClick={() => handleQtyStep(index, 1)}
                                disabled={isSubmitting}
                                title="Tambah qty"
                                aria-label={`Tambah qty item bundle ${index + 1}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="bundle-create-popup__component-actions">
                            {index === components.length - 1 &&
                            components.length < BUNDLE_MAX_COMPONENTS ? (
                              <button
                                type="button"
                                className="bundle-create-popup__component-add"
                                onClick={handleAddComponent}
                                disabled={isSubmitting}
                                title="Tambah item"
                                aria-label="Tambah item bundle"
                              >
                                <Plus size={16} />
                              </button>
                            ) : (
                              <span
                                className="bundle-create-popup__component-action-spacer"
                                aria-hidden="true"
                              />
                            )}

                            <button
                              type="button"
                              className="bundle-create-popup__component-remove"
                              onClick={() => handleRemoveComponent(index)}
                              disabled={isSubmitting || components.length <= BUNDLE_MIN_COMPONENTS}
                              title="Hapus component"
                              aria-label={`Hapus item bundle ${index + 1}`}
                            >
                              <Trash03 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bundle-create-popup__footer">
                    <p className="register-user-popup__hint">
                      Minimal {BUNDLE_MIN_COMPONENTS} item dan maksimal {BUNDLE_MAX_COMPONENTS} item regular per bundle.
                    </p>
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

export default DialogCreateBundle
