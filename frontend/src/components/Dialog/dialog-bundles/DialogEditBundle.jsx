import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableBundleSelect.jsx'

const BUNDLE_MIN_COMPONENTS = 2
const BUNDLE_MAX_COMPONENTS = 5

const initialFormValues = {
  parent_id: '',
  uom_id: '',
  sku_status_id: '',
  business_unit_id: '',
  variant: '',
  qty_per_pack: '',
  is_active: '1',
}

const bundleFields = [
  {
    name: 'parent_id',
    label: 'Parent',
    placeholder: 'Pilih parent',
    type: 'select',
    optionsKey: 'parents',
    searchPlaceholder: 'Cari parent...',
    emptyMessage: 'Parent tidak ditemukan.',
  },
  {
    name: 'uom_id',
    label: 'UOM',
    placeholder: 'Pilih UOM',
    type: 'select',
    optionsKey: 'uoms',
    searchPlaceholder: 'Cari UOM...',
    emptyMessage: 'UOM tidak ditemukan.',
  },
  {
    name: 'sku_status_id',
    label: 'SKU Status',
    placeholder: 'Pilih SKU status',
    type: 'select',
    optionsKey: 'skuStatuses',
    searchPlaceholder: 'Cari SKU status...',
    emptyMessage: 'SKU status tidak ditemukan.',
  },
  {
    name: 'business_unit_id',
    label: 'Business Unit',
    placeholder: 'Pilih business unit',
    type: 'select',
    optionsKey: 'businessUnits',
    searchPlaceholder: 'Cari business unit...',
    emptyMessage: 'Business unit tidak ditemukan.',
  },
  {
    name: 'variant',
    label: 'Variant',
    placeholder: 'BUNDLE TEST',
  },
  {
    name: 'qty_per_pack',
    label: 'Qty / Pack',
    placeholder: '1',
    type: 'number',
  },
]

const numericFields = new Set([
  'qty_per_pack',
  'is_active',
])

const emptyMasterOptions = {
  parents: [],
  uoms: [],
  skuStatuses: [],
  businessUnits: [],
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
    .map((parent) =>
      makeOption(parent.id, [
        parent.parent_name || parent.item_name,
        parent.parent_code,
      ]),
    )
    .filter((option) => option.value && option.label)
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

function normalizeBusinessUnitOptions(responseData, itemRows = []) {
  const optionMap = new Map()

  normalizeListResponse(responseData).forEach((unit) => {
    const option = makeOption(unit.id ?? unit.value, [unit.name, unit.code])

    if (option.value && option.label) {
      optionMap.set(option.value, option)
    }
  })

  itemRows.forEach((item) => {
    const unit = item.business_unit
    const option = makeOption(unit?.id ?? item.business_unit_id, [unit?.name, unit?.code])

    if (option.value && option.label && !optionMap.has(option.value)) {
      optionMap.set(option.value, option)
    }
  })

  return Array.from(optionMap.values()).sort((firstOption, secondOption) =>
    firstOption.label.localeCompare(secondOption.label),
  )
}

function normalizeDepartmentOptions(responseData, itemRows = [], businessUnitId = '') {
  const optionMap = new Map()

  normalizeListResponse(responseData).forEach((department) => {
    const option = makeOption(department.department_id ?? department.id ?? department.value, [
      department.department_name ?? department.name,
      department.department_code ?? department.code,
    ])

    if (option.value && option.label) {
      option.code = department.department_code ?? department.code ?? ''
      optionMap.set(option.value, option)
    }
  })

  itemRows.forEach((item) => {
    if (String(item.business_unit?.id ?? item.business_unit_id ?? '') !== String(businessUnitId)) {
      return
    }

    ;(item.channels ?? []).forEach((channel) => {
      const option = makeOption(channel.department_id, [
        channel.channel_name,
        channel.channel_code,
      ])

      if (option.value && option.label && !optionMap.has(option.value)) {
        option.code = channel.channel_code ?? ''
        optionMap.set(option.value, option)
      }
    })
  })

  return Array.from(optionMap.values()).sort((firstOption, secondOption) =>
    firstOption.label.localeCompare(secondOption.label),
  )
}

function getNestedId(item, key) {
  return item?.[`${key}_id`] ?? item?.[key]?.id ?? ''
}

function getSelectedDepartmentId(item) {
  const primaryChannel = item?.channels?.find((channel) => Number(channel.is_primary) === 1)
  const selectedChannel = primaryChannel ?? item?.channels?.[0]

  return selectedChannel?.department_id ?? item?.department_id ?? ''
}

function normalizeComponentsFromItem(item) {
  const itemComponents = item?.components

  if (!Array.isArray(itemComponents) || itemComponents.length === 0) {
    return [
      { component_item_id: '', qty: '' },
      { component_item_id: '', qty: '' },
    ]
  }

  const sorted = [...itemComponents].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return sorted.map((comp) => ({
    component_item_id: String(comp.component_item_id ?? comp.item_id ?? ''),
    qty: String(comp.qty ?? ''),
  }))
}

function createFormValuesFromItem(item) {
  if (!item) {
    return initialFormValues
  }

  return {
    parent_id: String(getNestedId(item, 'parent')),
    uom_id: String(getNestedId(item, 'uom')),
    sku_status_id: String(getNestedId(item, 'sku_status')),
    business_unit_id: String(getNestedId(item, 'business_unit')),
    variant: item.variant ?? '',
    qty_per_pack: item.qty_per_pack ?? '',
    is_active: String(item.is_active ?? 1),
  }
}

function createChannelPayload(formValues, departmentOption) {
  if (!formValues.business_unit_id || !formValues.department_id || !departmentOption) {
    return []
  }

  const numericDepartmentId = Number(formValues.department_id)

  return [
    {
      business_unit_id: formValues.business_unit_id,
      department_id: Number.isNaN(numericDepartmentId)
        ? formValues.department_id
        : numericDepartmentId,
      channel_code: departmentOption.code || departmentOption.value,
      channel_name: departmentOption.label,
      is_primary: 1,
      is_active: 1,
    },
  ]
}

function buildPayload(formValues, masterOptions, components) {
  const payload = Object.fromEntries(
    Object.entries(formValues)
      .map(([key, value]) => {
        const trimmedValue = String(value ?? '').trim()

        if (trimmedValue === '') {
          return [key, '']
        }

        return [key, numericFields.has(key) ? Number(trimmedValue) : trimmedValue]
      })
      .filter(([, value]) => value !== ''),
  )

  const validComponents = components
    .filter((c) => c.component_item_id && String(c.qty).trim() !== '')
    .map((c, index) => ({
      component_item_id: c.component_item_id,
      qty: Number(c.qty),
      sort_order: index + 1,
    }))

  if (validComponents.length > 0) {
    payload.components = validComponents
  }

  return payload
}

function hasRequiredValues(payload, components) {
  if (!payload.parent_id || !payload.business_unit_id) {
    return false
  }

  const validComponents = components.filter(
    (c) => c.component_item_id && String(c.qty).trim() !== '',
  )

  return validComponents.length >= BUNDLE_MIN_COMPONENTS
}

function DialogEditBundle({
  isOpen = false,
  eyebrow = 'Edit Bundle',
  title = 'Edit Bundle',
  item = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromItem(item))
  const [components, setComponents] = useState(() => normalizeComponentsFromItem(item))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [itemOptionRows, setItemOptionRows] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromItem(item))
    setComponents(normalizeComponentsFromItem(item))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [item])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    if (isOpen) {
      setFormValues(createFormValuesFromItem(item))
      setComponents(normalizeComponentsFromItem(item))
    }
  }, [isOpen, item])

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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadMasterOptions = async () => {
      setIsLoadingMasters(true)

      try {
        const [parents, uoms, skuStatuses, items] = await Promise.all([
          api.itemParents.list({ status: 'active' }, { signal: controller.signal }),
          api.uoms.list({ is_active: 1 }, { signal: controller.signal }),
          api.skuStatuses.list({ is_active: 1 }, { signal: controller.signal }),
          api.items.list({ item_kind: 'regular' }, { signal: controller.signal }),
        ])
        let businessUnits = []

        try {
          businessUnits = await api.businessUnits.list(
            { active: 1 },
            { signal: controller.signal },
          )
        } catch (error) {
          if (error?.name === 'AbortError') {
            throw error
          }
        }

        if (!isMounted) {
          return
        }

        const itemRows = normalizeListResponse(items)

        setItemOptionRows(itemRows)
        setMasterOptions({
          parents: normalizeParentOptions(parents),
          uoms: normalizeMasterOptions(uoms),
          skuStatuses: normalizeMasterOptions(skuStatuses),
          businessUnits: normalizeBusinessUnitOptions(businessUnits, itemRows),
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
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    handleFieldChange(name, value)
  }

  const handleComponentChange = (index, field, value) => {
    setComponents((currentComponents) =>
      currentComponents.map((comp, i) => (i === index ? { ...comp, [field]: value } : comp)),
    )
  }

  const handleAddComponent = () => {
    if (components.length < BUNDLE_MAX_COMPONENTS) {
      setComponents((current) => [...current, { component_item_id: '', qty: '' }])
    }
  }

  const handleRemoveComponent = (index) => {
    if (components.length > BUNDLE_MIN_COMPONENTS) {
      setComponents((current) => current.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!item?.id) {
      setErrorMessage('ID bundle tidak ditemukan.')
      return
    }

    const payload = buildPayload(formValues, masterOptions, components)

    if (!hasRequiredValues(payload, components)) {
      setErrorMessage(
        `Lengkapi parent, business unit, dan minimal ${BUNDLE_MIN_COMPONENTS} component item.`,
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

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
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
                  {/* Item Kind (readonly) */}
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="edit-bundle-item-kind">
                      Item Kind
                    </label>
                    <input
                      id="edit-bundle-item-kind"
                      className="register-user-popup__input"
                      value={item?.item_kind ?? 'bundle'}
                      readOnly
                      disabled
                    />
                  </div>

                  {/* Status */}
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="edit-bundle-is-active">
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

                  {/* Bundle fields */}
                  {bundleFields.map((field) => (
                    <div
                      key={field.name}
                      className={`register-user-popup__field${
                        field.full ? ' register-user-popup__field--full' : ''
                      }`}
                    >
                      <label
                        className="register-user-popup__label"
                        htmlFor={`edit-bundle-${field.name}`}
                      >
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <SearchableItemSelect
                          id={`edit-bundle-${field.name}`}
                          label={field.label}
                          value={formValues[field.name]}
                          options={masterOptions[field.optionsKey]}
                          placeholder={field.placeholder}
                          searchPlaceholder={field.searchPlaceholder}
                          emptyMessage={field.emptyMessage}
                          loading={
                            field.name === 'department_id'
                              ? isLoadingDepartments
                              : isLoadingMasters
                          }
                          disabled={
                            isSubmitting ||
                            isLoadingMasters ||
                            (field.name === 'department_id' && !formValues.business_unit_id)
                          }
                          onChange={(nextValue) => handleFieldChange(field.name, nextValue)}
                        />
                      ) : (
                        <input
                          id={`edit-bundle-${field.name}`}
                          name={field.name}
                          className="register-user-popup__input"
                          type={field.type === 'number' ? 'number' : 'text'}
                          step={field.type === 'number' ? 'any' : undefined}
                          value={formValues[field.name]}
                          placeholder={field.placeholder}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Components Section */}
                <div className="register-user-popup__section" style={{ marginTop: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <p
                      className="register-user-popup__label"
                      style={{ margin: 0, fontWeight: 600 }}
                    >
                      Components ({components.length}/{BUNDLE_MAX_COMPONENTS})
                      <span
                        style={{
                          fontWeight: 400,
                          opacity: 0.6,
                          marginLeft: '0.5rem',
                          fontSize: '0.8em',
                        }}
                      >
                        min {BUNDLE_MIN_COMPONENTS}, maks {BUNDLE_MAX_COMPONENTS} item regular
                      </span>
                    </p>
                    {components.length < BUNDLE_MAX_COMPONENTS && (
                      <button
                        type="button"
                        className="dashboard-popup__button dashboard-popup__button--secondary"
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={handleAddComponent}
                        disabled={isSubmitting}
                      >
                        + Tambah
                      </button>
                    )}
                  </div>

                  {components.map((comp, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px auto',
                        gap: '0.5rem',
                        marginBottom: '0.5rem',
                        alignItems: 'end',
                      }}
                    >
                      <div>
                        <label
                          className="register-user-popup__label"
                          htmlFor={`edit-bundle-component-item-${index}`}
                          style={{ fontSize: '0.8em' }}
                        >
                          Item #{index + 1}
                        </label>
                        <SearchableItemSelect
                          id={`edit-bundle-component-item-${index}`}
                          label={`Component item ${index + 1}`}
                          value={comp.component_item_id}
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
                      <div>
                        <label
                          className="register-user-popup__label"
                          htmlFor={`edit-bundle-component-qty-${index}`}
                          style={{ fontSize: '0.8em' }}
                        >
                          Qty
                        </label>
                        <input
                          id={`edit-bundle-component-qty-${index}`}
                          className="register-user-popup__input"
                          type="number"
                          min="1"
                          step="1"
                          value={comp.qty}
                          placeholder="1"
                          onChange={(e) => handleComponentChange(index, 'qty', e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div style={{ paddingBottom: '0.125rem' }}>
                        <button
                          type="button"
                          className="dashboard-popup__button dashboard-popup__button--secondary"
                          style={{
                            padding: '0.4rem 0.6rem',
                            fontSize: '0.8rem',
                            opacity: components.length <= BUNDLE_MIN_COMPONENTS ? 0.4 : 1,
                          }}
                          onClick={() => handleRemoveComponent(index)}
                          disabled={isSubmitting || components.length <= BUNDLE_MIN_COMPONENTS}
                          title="Hapus component"
                        >
                          ✕
                        </button>
                      </div>
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

export default DialogEditBundle
