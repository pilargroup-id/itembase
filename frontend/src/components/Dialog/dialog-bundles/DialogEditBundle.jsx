import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { Minus, Plus, Trash03, XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableBundleSelect.jsx'

const BUNDLE_MIN_COMPONENTS = 2
const BUNDLE_MAX_COMPONENTS = 5

const initialFormValues = {
  parent_id: '',
  selling_name: '',
  uom_id: '',
  is_active: '1',
}

const initialComponent = () => ({ component_item_id: '', qty: '' })

const bundleFields = [
  {
    name: 'parent_id',
    label: 'Parent',
    placeholder: 'Pilih Parent',
    type: 'select',
    optionsKey: 'parents',
    searchPlaceholder: 'Cari Parent...',
    emptyMessage: 'Parent tidak ditemukan.',
    required: true,
  },
  {
    name: 'selling_name',
    label: 'Selling Name',
    placeholder: 'Masukan Selling Name',
  },
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
  parents: [],
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
    .map((item) =>
      makeOption(item.id, [
        item.item_name || item.item_code,
        item.item_code,
        item.barcode,
      ]),
    )
    .filter((option) => option.value && option.label)
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

function getNestedId(item, key) {
  return item?.[`${key}_id`] ?? item?.[key]?.id ?? ''
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
    qty: sanitizeIntegerInput(component.qty),
  }))

  while (normalizedComponents.length < BUNDLE_MIN_COMPONENTS) {
    normalizedComponents.push(initialComponent())
  }

  return normalizedComponents
}

function createRegularItemOption(item) {
  return makeOption(item?.id ?? item?.item_id ?? item?.value, [
    item?.item_name || item?.item_code,
    item?.item_code,
    item?.barcode,
  ])
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
    uom_id: String(getNestedId(item, 'uom')),
    is_active: String(item.is_active ?? 1),
  }
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
  if (!payload.item_kind || !payload.parent_id || !payload.uom_id) {
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
  const [parentSearchQuery, setParentSearchQuery] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const componentItemOptions = useMemo(
    () =>
      mergeOptions(
        masterOptions.regularItems,
        normalizeRegularItemOptionsFromComponents(bundleItem ?? item),
      ),
    [bundleItem, item, masterOptions.regularItems],
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

  const resetDialogState = useCallback(() => {
    const currentItem = bundleItem ?? item

    setFormValues(createFormValuesFromItem(currentItem))
    setComponents(normalizeComponentsFromItem(currentItem))
    setIsSubmitting(false)
    setMasterOptions(emptyMasterOptions)
    setParentSearchQuery('')
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

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          uoms: normalizeMasterOptions(uoms),
          regularItems: normalizeRegularItemOptions(items),
        }))
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
        setErrorMessage(error?.message || 'Gagal memuat parent bundle.')
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

    if (!item?.id) {
      setErrorMessage('ID bundle tidak ditemukan.')
      return
    }

    const payload = buildPayload(formValues, components)

    if (!hasRequiredValues(payload, components)) {
      setErrorMessage(
        `Lengkapi Parent, UOM, dan minimal ${BUNDLE_MIN_COMPONENTS} component item dengan qty angka bulat.`,
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedItem = await api.items.update(item.id, payload)

      onEdited?.(editedItem, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah bundle.')
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
                              htmlFor={`edit-bundle-component-item-${index}`}
                            >
                              Item Regular
                              <span style={{ color: 'red', marginLeft: '4px' }}>*</span>
                            </label>
                            <SearchableItemSelect
                              id={`edit-bundle-component-item-${index}`}
                              label={`Component item ${index + 1}`}
                              value={component.component_item_id}
                              options={componentItemOptions}
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
                              htmlFor={`edit-bundle-component-qty-${index}`}
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
                                id={`edit-bundle-component-qty-${index}`}
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
            {isSubmitting ? 'Saving...' : 'Edit'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditBundle
