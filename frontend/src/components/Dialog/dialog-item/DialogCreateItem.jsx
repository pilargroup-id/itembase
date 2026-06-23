import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableItemSelect.jsx'

const initialFormValues = {
  item_kind: 'regular',
  item_name: '',
  parent_id: '',
  uom_id: '',
  sku_status_id: '',
  business_unit_id: '',
  department_id: '',
  variant: '',
  qty_per_pack: '',
  height: '',
  width: '',
  depth: '',
  gross_weight_pack: '',
  container_20ft_qty: '',
  container_40hq_qty: '',
  production_time_days: '',
  is_active: '1',
}

const itemFields = [
  {
    name: 'item_name',
    label: 'Item Name',
    placeholder: 'TEST GOTO BOTTLE BLUE',
    full: true,
  },
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
    name: 'department_id',
    label: 'Channel',
    placeholder: 'Pilih channel',
    type: 'select',
    optionsKey: 'departments',
    searchPlaceholder: 'Cari channel...',
    emptyMessage: 'Channel tidak ditemukan.',
  },
  {
    name: 'variant',
    label: 'Variant',
    placeholder: 'BLUE',
  },
  {
    name: 'qty_per_pack',
    label: 'Qty / Pack',
    placeholder: '1',
    type: 'number',
  },
  {
    name: 'height',
    label: 'Height',
    placeholder: '25',
    type: 'number',
  },
  {
    name: 'width',
    label: 'Width',
    placeholder: '8',
    type: 'number',
  },
  {
    name: 'depth',
    label: 'Depth',
    placeholder: '8',
    type: 'number',
  },
  {
    name: 'gross_weight_pack',
    label: 'Gross Weight / Pack',
    placeholder: '0.30',
    type: 'number',
  },
  {
    name: 'container_20ft_qty',
    label: '20ft Qty',
    placeholder: '2000',
    type: 'number',
  },
  {
    name: 'container_40hq_qty',
    label: '40HQ Qty',
    placeholder: '4500',
    type: 'number',
  },
  {
    name: 'production_time_days',
    label: 'Production Days',
    placeholder: '10',
    type: 'number',
  },
]

const numericFields = new Set([
  'qty_per_pack',
  'height',
  'width',
  'depth',
  'gross_weight_pack',
  'container_20ft_qty',
  'container_40hq_qty',
  'production_time_days',
  'is_active',
])

const emptyMasterOptions = {
  parents: [],
  uoms: [],
  skuStatuses: [],
  businessUnits: [],
  departments: [],
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

function buildPayload(formValues, masterOptions) {
  const selectedDepartment = masterOptions.departments.find(
    (option) => option.value === String(formValues.department_id),
  )
  const payload = Object.fromEntries(
    Object.entries(formValues)
      .map(([key, value]) => {
        const trimmedValue = String(value ?? '').trim()

        if (trimmedValue === '') {
          return [key, '']
        }

        return [key, numericFields.has(key) ? Number(trimmedValue) : trimmedValue]
      })
      .filter(([key]) => key !== 'department_id')
      .filter(([, value]) => value !== ''),
  )
  const channels = createChannelPayload(formValues, selectedDepartment)

  if (channels.length > 0) {
    payload.channels = channels
  }

  return payload
}

function hasRequiredValues(payload) {
  if (!payload.item_kind || !payload.parent_id || !payload.business_unit_id) {
    return false
  }

  if (payload.item_kind === 'regular' && !payload.item_name) {
    return false
  }

  return Array.isArray(payload.channels) && payload.channels.length > 0
}

function DialogCreateItem({
  isOpen = false,
  eyebrow = 'Create Item',
  title = 'Create Item',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [itemOptionRows, setItemOptionRows] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setMasterOptions((currentOptions) => ({
      ...currentOptions,
      departments: [],
    }))
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
          api.items.list({}, { signal: controller.signal }),
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
          departments: [],
        })
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
        setErrorMessage(error?.message || 'Gagal memuat data master item.')
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
    if (!isOpen || !formValues.business_unit_id) {
      setMasterOptions((currentOptions) => ({
        ...currentOptions,
        departments: [],
      }))
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadDepartmentOptions = async () => {
      setIsLoadingDepartments(true)
      setErrorMessage('')

      try {
        let departments = []

        try {
          departments = await api.businessUnits.departments(
            formValues.business_unit_id,
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

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          departments: normalizeDepartmentOptions(
            departments,
            itemOptionRows,
            formValues.business_unit_id,
          ),
        }))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          departments: [],
        }))
        setErrorMessage(error?.message || 'Gagal memuat data channel.')
      } finally {
        if (isMounted) {
          setIsLoadingDepartments(false)
        }
      }
    }

    loadDepartmentOptions()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [formValues.business_unit_id, isOpen, itemOptionRows])

  const handleFieldChange = (name, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
      ...(name === 'business_unit_id' ? { department_id: '' } : {}),
    }))
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    handleFieldChange(name, value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload(formValues, masterOptions)

    if (!hasRequiredValues(payload)) {
      setErrorMessage(
        'Lengkapi item kind, parent, business unit, channel, dan item name untuk regular item.',
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
      setErrorMessage(error?.message || 'Gagal membuat item.')
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
      <label className="register-user-popup__label" htmlFor={`item-${field.name}`}>
        {field.label}
      </label>
      {field.type === 'select' ? (
        <SearchableItemSelect
          id={`item-${field.name}`}
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
          id={`item-${field.name}`}
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
  )

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
        aria-labelledby="dialog-create-item-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-item-title">
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
                <div style={{ marginBottom: '8px' }}>
                  <div className="register-user-popup__grid" style={{ rowGap: '12px' }}>
                    <div className="register-user-popup__field">
                      <label className="register-user-popup__label" htmlFor="item-kind">
                        Item Kind
                      </label>
                      <input
                        id="item-kind"
                        name="item_kind"
                        className="register-user-popup__input"
                        type="text"
                        value={formValues.item_kind}
                        readOnly
                        disabled
                      />
                    </div>

                    <div className="register-user-popup__field">
                      <label className="register-user-popup__label" htmlFor="item-is-active">
                        Status
                      </label>
                      <select
                        id="item-is-active"
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

                    {itemFields
                      .filter((f) => ['item_name', 'parent_id', 'sku_status_id'].includes(f.name))
                      .map(renderField)}
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div className="register-user-popup__grid" style={{ rowGap: '12px' }}>
                    {itemFields
                      .filter((f) => ['business_unit_id', 'department_id'].includes(f.name))
                      .map(renderField)}
                  </div>
                </div>

                <div style={{ marginBottom: '8px' }}>
                  <div className="register-user-popup__grid" style={{ rowGap: '12px' }}>
                    {itemFields
                      .filter((f) =>
                        [
                          'uom_id',
                          'variant',
                          'qty_per_pack',
                          'height',
                          'width',
                          'depth',
                          'gross_weight_pack',
                          'container_20ft_qty',
                          'container_40hq_qty',
                          'production_time_days',
                        ].includes(f.name)
                      )
                      .map(renderField)}
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
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateItem
