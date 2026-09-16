import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { Plus, Trash03, XClose, XCircle } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableBundleSelect.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'

const BUNDLE_MIN_COMPONENTS = 1
const BUNDLE_MAX_COMPONENTS = 5
const SINGLE_COMPONENT_MIN_QTY = 2

const initialFormValues = {
  parent_id: '',
  selling_name: '',
  is_active: '1',
}

const initialComponent = () => ({ component_item_id: '', qty: '' })

const bundleFields = [
  {
    name: 'parent_id',
    label: 'Parent',
    placeholder: 'Select Parent',
    type: 'select',
    optionsKey: 'parents',
    searchPlaceholder: 'Search Parent...',
    emptyMessage: 'Parent not found.',
    required: true,
  },
  {
    name: 'selling_name',
    label: 'Selling Name',
    placeholder: 'Enter Selling Name',
  },
]

const numericFields = new Set(['is_active'])
const integerInputFields = new Set()

const emptyMasterOptions = {
  parents: [],
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

function normalizeParentOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((parent) => {
      const option = makeOption(
        parent.id ??
          parent.value ??
          parent.parent_id ??
          parent.item_parent_id,
        [
        parent.label,
        parent.parent_name || parent.item_name,
        parent.parent_code,
        ],
      )

      return {
        ...option,
        sellingName: String(parent.selling_name ?? parent.item_name ?? ''),
      }
    })
    .filter((option) => option.value && option.label)
}

function getParentId(item) {
  return (
    item?.parent_id ??
    item?.item_parent_id ??
    item?.parent?.id ??
    item?.parent?.parent_id ??
    item?.parent?.item_parent_id ??
    item?.item_parent?.id ??
    item?.item_parent?.parent_id ??
    item?.item_parent?.item_parent_id ??
    ''
  )
}

function normalizeParentOptionFromItem(item) {
  const parent = item?.parent ?? item?.item_parent ?? null
  const parentId = getParentId(item)

  if (!parentId) {
    return []
  }

  const option = makeOption(parentId, [
    parent?.label,
    parent?.parent_name || parent?.item_name,
    parent?.parent_code,
    item?.parent_name || item?.item_parent_name,
    item?.parent_code || item?.item_parent_code,
    item?.item_parent_parent_name,
    item?.item_parent_parent_code,
  ])

  return option.value && option.label
    ? [
        {
          ...option,
          sellingName: String(parent?.selling_name ?? item?.selling_name ?? item?.item_name ?? ''),
        },
      ]
    : []
}

function normalizeRegularItemOptions(responseData) {
  return normalizeListResponse(responseData)
    .filter((item) => item.item_kind === 'regular')
    .map((item) => ({
      ...makeOption(item.id, [
        item.item_name || item.item_code,
        item.item_code,
        item.barcode,
      ]),
      uomId: String(item.uom_id ?? item.uom?.id ?? ''),
      uomLabel: item.uom?.name || item.uom?.code || '',
    }))
    .filter((option) => option.value && option.label)
}

function findRegularItemOption(options, value) {
  const normalizedValue = String(value ?? '')

  return options.find((option) => option.value === normalizedValue) ?? null
}

function mergeOptions(...optionLists) {
  const optionMap = new Map()

  optionLists.flat().forEach((option) => {
    if (option?.value && option?.label && !optionMap.has(option.value)) {
      optionMap.set(option.value, option)
    }
  })

  return Array.from(optionMap.values())
}

function sanitizeIntegerInput(value) {
  return String(value ?? '').replace(/[^\d]/g, '')
}

function toIntegerString(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numberValue = Number(value)

  if (!Number.isFinite(numberValue)) {
    return sanitizeIntegerInput(value)
  }

  return String(Math.trunc(numberValue))
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

function normalizeItemDetailResponse(responseData) {
  if (responseData?.data?.data && !Array.isArray(responseData.data.data)) {
    return responseData.data.data
  }

  if (responseData?.data && !Array.isArray(responseData.data)) {
    return responseData.data
  }

  return responseData
}

function getItemComponents(item) {
  return (
    item?.components ??
    item?.bundle_components ??
    item?.item_bundle_components ??
    item?.itemBundleComponents ??
    []
  )
}

function getComponentItem(component) {
  return (
    component?.component_item ??
    component?.componentItem ??
    component?.regular_item ??
    component?.regularItem ??
    component?.item ??
    null
  )
}

function getComponentItemId(component) {
  return (
    component?.component_item_id ??
    component?.componentItemId ??
    component?.regular_item_id ??
    component?.item_id ??
    getComponentItem(component)?.id ??
    ''
  )
}

function normalizeComponentsFromItem(item) {
  const itemComponents = getItemComponents(item)

  if (!Array.isArray(itemComponents) || itemComponents.length === 0) {
    return [initialComponent(), initialComponent()]
  }

  const sorted = [...itemComponents].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  const normalizedComponents = sorted.slice(0, BUNDLE_MAX_COMPONENTS).map((component) => ({
    component_item_id: String(getComponentItemId(component)),
    qty: toIntegerString(component.qty),
  }))

  while (normalizedComponents.length < BUNDLE_MIN_COMPONENTS) {
    normalizedComponents.push(initialComponent())
  }

  return normalizedComponents
}

function createRegularItemOption(item) {
  return {
    ...makeOption(item?.id ?? item?.item_id ?? item?.value, [
      item?.item_name || item?.item_code,
      item?.item_code,
      item?.barcode,
    ]),
    uomId: String(item?.uom_id ?? item?.uom?.id ?? ''),
    uomLabel: item?.uom?.name || item?.uom?.code || '',
  }
}

function normalizeRegularItemOptionsFromComponents(item) {
  const itemComponents = getItemComponents(item)

  if (!Array.isArray(itemComponents)) {
    return []
  }

  return itemComponents
    .map((component) => {
      const componentItem = getComponentItem(component)

      return createRegularItemOption({
        ...componentItem,
        id: getComponentItemId(component),
      })
    })
    .filter((option) => option.value && option.label)
}

function createFormValuesFromItem(item) {
  if (!item) {
    return initialFormValues
  }

  return {
    parent_id: String(getParentId(item)),
    selling_name: item.selling_name ?? item.item_name ?? '',
    is_active: String(item.is_active ?? 1),
  }
}

function buildPayload(formValues, components, resolvedUomId) {
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
  payload.uom_id = resolvedUomId || ''

  if (!payload.uom_id) {
    delete payload.uom_id
  }

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
  if (!payload.item_kind || !payload.parent_id || !payload.uom_id) {
    return false
  }

  const validComponents = components.filter(
    (component) => component.component_item_id && isPositiveInteger(component.qty),
  )

  if (
    validComponents.length < BUNDLE_MIN_COMPONENTS ||
    validComponents.length > BUNDLE_MAX_COMPONENTS
  ) {
    return false
  }

  return (
    validComponents.length > 1 ||
    Number(validComponents[0].qty) >= SINGLE_COMPONENT_MIN_QTY
  )
}

function BundleValidationAlertBanner({ message, onDismiss }) {
  if (!message) {
    return null
  }

  return (
    <div className="item-create-popup__validation-alert" role="alert">
      <span className="item-create-popup__validation-alert-icon" aria-hidden="true">
        <XCircle size={18} />
      </span>

      <div className="item-create-popup__validation-alert-body">
        <p className="item-create-popup__validation-alert-title">Gagal</p>
        <p className="item-create-popup__validation-alert-message">{message}</p>
      </div>

      <div className="item-create-popup__validation-alert-actions">
        <button
          type="button"
          className="item-create-popup__validation-alert-close"
          onClick={onDismiss}
          aria-label="Tutup notifikasi"
        >
          <XClose size={14} />
        </button>
      </div>
    </div>
  )
}

function DialogEditBundle({
  isOpen = false,
  eyebrow = 'Edit Bundle',
  title = 'Edit Bundle',
  item = null,
  onClose,
  onEdited,
}) {
  const [bundleItem, setBundleItem] = useState(item)
  const [formValues, setFormValues] = useState(() => createFormValuesFromItem(item))
  const [components, setComponents] = useState(() => normalizeComponentsFromItem(item))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [isLoadingParentOptions, setIsLoadingParentOptions] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [selectedRegularItemOptions, setSelectedRegularItemOptions] = useState([])
  const [parentSearchQuery, setParentSearchQuery] = useState('')
  const [regularItemSearchQuery, setRegularItemSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

  const componentItemOptions = useMemo(
    () =>
      mergeOptions(
        masterOptions.regularItems,
        normalizeRegularItemOptionsFromComponents(bundleItem ?? item),
        selectedRegularItemOptions,
      ),
    [bundleItem, item, masterOptions.regularItems, selectedRegularItemOptions],
  )
  const parentOptions = useMemo(
    () => mergeOptions(masterOptions.parents, normalizeParentOptionFromItem(bundleItem ?? item)),
    [bundleItem, item, masterOptions.parents],
  )
  const bundleFormulaPreview = useMemo(
    () => buildBundleFormulaPreview(components, componentItemOptions),
    [componentItemOptions, components],
  )
  const dialogTitle = bundleFormulaPreview || title

  const resolvedComponentItemId = useMemo(
    () => components.find((component) => component.component_item_id)?.component_item_id ?? '',
    [components],
  )
  const resolvedUomOption = useMemo(
    () => findRegularItemOption(componentItemOptions, resolvedComponentItemId),
    [componentItemOptions, resolvedComponentItemId],
  )

  const resetDialogState = useCallback(() => {
    const currentItem = bundleItem ?? item

    setFormValues(createFormValuesFromItem(currentItem))
    setComponents(normalizeComponentsFromItem(currentItem))
    setIsSubmitting(false)
    setMasterOptions(emptyMasterOptions)
    setSelectedRegularItemOptions([])
    setParentSearchQuery('')
    setRegularItemSearchQuery('')
    setErrorMessage('')
  }, [bundleItem, item])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setBundleItem(item)
    setFormValues(createFormValuesFromItem(item))
    setComponents(normalizeComponentsFromItem(item))
  }, [isOpen, item])

  useEffect(() => {
    if (!isOpen || !item?.id) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadBundleDetail = async () => {
      try {
        const response = await api.items.detail(item.id, undefined, { signal: controller.signal })
        const detailItem = normalizeItemDetailResponse(response)

        if (!isMounted || !detailItem) {
          return
        }

        setBundleItem(detailItem)
        setFormValues(createFormValuesFromItem(detailItem))
        setComponents(normalizeComponentsFromItem(detailItem))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }
      }
    }

    loadBundleDetail()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isOpen, item?.id])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadRegularItemOptions = async () => {
      setIsLoadingMasters(true)

      try {
        const search = regularItemSearchQuery.trim()
        const items = await api.items.list(
          {
            page: 1,
            limit: 20,
            item_kind: 'regular',
            ...(search ? { search } : {}),
          },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          regularItems: normalizeRegularItemOptions(items),
        }))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          regularItems: [],
        }))
        setErrorMessage(error?.message || 'Failed to load regular items.')
      } finally {
        if (isMounted) {
          setIsLoadingMasters(false)
        }
      }
    }

    loadRegularItemOptions()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isOpen, regularItemSearchQuery])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadParentOptions = async () => {
      setIsLoadingParentOptions(true)

      try {
        const search = parentSearchQuery.trim()
        const response = await api.itemParents.options(
          {
            page: 1,
            limit: 20,
            status: 'active',
            ...(search ? { search } : {}),
          },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          parents: normalizeParentOptions(response),
        }))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          parents: [],
        }))
        setErrorMessage(error?.message || 'Failed to load bundle parents.')
      } finally {
        if (isMounted) {
          setIsLoadingParentOptions(false)
        }
      }
    }

    loadParentOptions()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isOpen, parentSearchQuery])

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

  const handleFieldChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const selectedParent =
        name === 'parent_id'
          ? parentOptions.find((option) => option.value === String(value ?? ''))
          : null

      return {
        ...currentValues,
        [name]: value,
        ...(name === 'parent_id' ? { selling_name: selectedParent?.sellingName || '' } : {}),
      }
    })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    const normalizedValue = integerInputFields.has(name)
      ? sanitizeIntegerInput(value)
      : value

    handleFieldChange(name, normalizedValue)
  }

  const handleRegularItemChange = (index, value) => {
    const selectedOption = findRegularItemOption(masterOptions.regularItems, value)

    if (selectedOption) {
      setSelectedRegularItemOptions((currentOptions) =>
        mergeOptions(currentOptions, [selectedOption]),
      )
    }

    handleComponentChange(index, 'component_item_id', value)
  }

  const handleComponentChange = (index, field, value) => {
    setErrorMessage('')

    let normalizedValue = value
    if (field === 'qty') {
      normalizedValue = sanitizeIntegerInput(String(value ?? ''))
    }

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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!item?.id) {
      setErrorMessage('Bundle ID not found.')
      return
    }

    const payload = buildPayload(formValues, components, resolvedUomOption?.uomId)

    if (!hasRequiredValues(payload, components)) {
      setErrorMessage(
        `Please complete Parent, UOM, and ${BUNDLE_MIN_COMPONENTS}-${BUNDLE_MAX_COMPONENTS} component items with whole number qty. A single item must have a minimum qty of ${SINGLE_COMPONENT_MIN_QTY}.`,
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedItem = await api.items.update(item.id, payload)

      onEdited?.(editedItem, payload)
      notifySuccess('Bundle updated successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to update bundle.')
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
      <label className="register-user-popup__label" htmlFor={`edit-bundle-${field.name}`}>
        {field.label}
        {field.required ? <span style={{ color: 'red', marginLeft: '4px' }}>*</span> : null}
      </label>
      {field.type === 'select' ? (
        <SearchableItemSelect
          id={`edit-bundle-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={field.name === 'parent_id' ? parentOptions : masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={
            field.name === 'parent_id'
              ? isLoadingParentOptions && !formValues.parent_id
              : isLoadingMasters
          }
          disabled={isSubmitting || isLoadingMasters}
          remoteSearch={field.name === 'parent_id'}
          onSearchChange={
            field.name === 'parent_id'
              ? setParentSearchQuery
              : undefined
          }
          onChange={(nextValue) => handleFieldChange(field.name, nextValue)}
        />
      ) : (
        <input
          id={`edit-bundle-${field.name}`}
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
        aria-labelledby="dialog-edit-bundle-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-bundle-title">
              {dialogTitle}
            </h2>
          </div>

          <XClose
            className="bundle-create-popup__close-icon"
            size={23}
            role="button"
            tabIndex={isSubmitting ? -1 : 0}
            aria-label="Close dialog"
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
                  <div className="register-user-popup__grid bundle-create-popup__meta-grid bundle-create-popup__meta-grid--with-status">
                    {bundleFields.map(renderField)}
                    <div className="register-user-popup__field">
                      <label
                        className="register-user-popup__label"
                        htmlFor="edit-bundle-is-active"
                      >
                        Status
                      </label>
                      <select
                        id="edit-bundle-is-active"
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
                </div>

                <div className="parent-create-popup__section bundle-create-popup__items-backdrop">
                  <div className="bundle-create-popup__section-top">
                    <div className="parent-create-popup__section-header">
                      <h3 className="parent-create-popup__section-title">Bundle Item List</h3>
                      <p className="parent-create-popup__section-description">
                        Add at least {BUNDLE_MIN_COMPONENTS} regular items. Qty must be a whole number without decimals.
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
                          <div className="register-user-popup__field bundle-create-popup__regular-item-field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`edit-bundle-component-item-${index}`}
                            >
                              Regular Item
                              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                            </label>
                            <SearchableItemSelect
                              id={`edit-bundle-component-item-${index}`}
                              label={`Component item ${index + 1}`}
                              value={component.component_item_id}
                              options={componentItemOptions}
                              placeholder="Select regular item..."
                              searchPlaceholder="Search item..."
                              emptyMessage="Item not found."
                              loading={isLoadingMasters}
                              disabled={isSubmitting || isLoadingMasters}
                              remoteSearch
                              onSearchChange={setRegularItemSearchQuery}
                              onChange={(nextValue) =>
                                handleRegularItemChange(index, nextValue)
                              }
                            />
                            {component.component_item_id ? (
                              <span className="bundle-create-popup__component-uom">
                                UOM:{' '}
                                {findRegularItemOption(
                                  componentItemOptions,
                                  component.component_item_id,
                                )?.uomLabel || '-'}
                              </span>
                            ) : null}
                          </div>

                          <div className="register-user-popup__field bundle-create-popup__qty-field">
                            <label
                              className="register-user-popup__label"
                              htmlFor={`edit-bundle-component-qty-${index}`}
                            >
                              Qty
                              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                            </label>
                            <input
                              id={`edit-bundle-component-qty-${index}`}
                              className="register-user-popup__input bundle-create-popup__qty-input"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="off"
                              value={String(component.qty || '')}
                              placeholder="0"
                              onChange={(event) =>
                                handleComponentChange(index, 'qty', event.target.value)
                              }
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="register-user-popup__field">
                            <span className="register-user-popup__label" aria-hidden="true">
                              &nbsp;
                            </span>
                            <div className="bundle-create-popup__component-actions">
                              <button
                                type="button"
                                className="bundle-create-popup__component-remove bundle-create-popup__component-remove--create"
                                onClick={() => handleRemoveComponent(index)}
                                disabled={
                                  isSubmitting || components.length <= BUNDLE_MIN_COMPONENTS
                                }
                                title="Remove component"
                                aria-label={`Remove bundle item ${index + 1}`}
                              >
                                <Trash03 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="bundle-create-popup__add-item"
                    onClick={handleAddComponent}
                    disabled={isSubmitting || components.length >= BUNDLE_MAX_COMPONENTS}
                  >
                    <Plus size={16} />
                    Add Item
                  </button>

                  <div className="bundle-create-popup__footer">
                    <p className="register-user-popup__hint">
                      A single-item bundle requires a minimum qty of {SINGLE_COMPONENT_MIN_QTY}.
                    </p>
                  </div>
                </div>

                <BundleValidationAlertBanner
                  message={errorMessage}
                  onDismiss={() => setErrorMessage('')}
                />
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
            {isSubmitting ? 'Saving...' : 'Edit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditBundle
