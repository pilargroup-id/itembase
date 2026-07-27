import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableItemSelect.jsx'

const initialFormValues = {
  item_kind: 'regular',
  item_name: '',
  uom_id: '',
  variant: '',
  qty_per_pack: '',
  height: '',
  width: '',
  depth: '',
  gross_weight_pack: '',
  production_time_days: '',
  is_active: '1',
}

const itemFields = [
  {
    name: 'item_name',
    label: 'Item Name + Variant',
    placeholder: 'TEST GOTO BOTTLE BLUE',
    required: true,
    full: true,
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
    name: 'variant',
    label: 'Variant',
    placeholder: 'BLUE',
  },
  {
    name: 'qty_per_pack',
    label: 'Qty / Pack',
    placeholder: '1',
    type: 'number',
    compactDimension: true,
    qtyField: true,
  },
  {
    name: 'height',
    label: 'H',
    placeholder: '25',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'width',
    label: 'W',
    placeholder: '8',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'depth',
    label: 'D',
    placeholder: '8',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'gross_weight_pack',
    label: 'Gross Weight / Pack',
    placeholder: '0.30',
    type: 'number',
    compactDimension: true,
  },
  {
    name: 'production_time_days',
    label: 'Lead Time',
    placeholder: '10',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'day',
  },
]

const numericFields = new Set([
  'qty_per_pack',
  'height',
  'width',
  'depth',
  'gross_weight_pack',
  'production_time_days',
  'is_active',
])

const emptyMasterOptions = {
  uoms: [],
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

function getSelectedDepartmentIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = String(value ?? '').trim()

  return normalizedValue ? [normalizedValue] : []
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

function createChannelPayload(formValues, departmentOptions) {
  const selectedDepartmentIds = getSelectedDepartmentIds(formValues.department_id)

  if (!formValues.business_unit_id || selectedDepartmentIds.length === 0) {
    return []
  }

  return selectedDepartmentIds
    .map((departmentId, index) => {
      const departmentOption = departmentOptions.find(
        (option) => option.value === String(departmentId),
      )

      if (!departmentOption) {
        return null
      }

      const numericDepartmentId = Number(departmentId)

      return {
        business_unit_id: formValues.business_unit_id,
        department_id: Number.isNaN(numericDepartmentId)
          ? departmentId
          : numericDepartmentId,
        channel_code: departmentOption.code || departmentOption.value,
        channel_name: departmentOption.label,
        is_primary: index === 0 ? 1 : 0,
        is_active: 1,
      }
    })
    .filter(Boolean)
}

function buildPayload(formValues, masterOptions) {
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
  const channels = createChannelPayload(formValues, masterOptions.departments)

  if (channels.length > 0) {
    payload.channels = channels
  }

  return payload
}

function hasRequiredValues(payload) {
  if (!payload.item_kind || !payload.item_name) {
    return false
  }

  return true
}

function ChannelCheckboxSelect({
  id,
  label,
  value = [],
  options = [],
  placeholder = 'Pilih data',
  emptyMessage = 'Data tidak ditemukan.',
  loading = false,
  disabled = false,
  onToggle,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const selectedIds = getSelectedDepartmentIds(value)
  const selectedOptions = options.filter((option) => selectedIds.includes(option.value))

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const updateMenuPosition = () => {
      const triggerElement = triggerRef.current

      if (!triggerElement) {
        return
      }

      const bounds = triggerElement.getBoundingClientRect()
      const viewportMargin = 12
      const gap = 8
      const menuWidth = Math.min(bounds.width, window.innerWidth - viewportMargin * 2)
      const left = Math.min(
        Math.max(bounds.left, viewportMargin),
        Math.max(viewportMargin, window.innerWidth - menuWidth - viewportMargin),
      )
      const spaceBelow = window.innerHeight - bounds.bottom - viewportMargin - gap
      const spaceAbove = bounds.top - viewportMargin - gap
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
      const optionsHeight = Math.max(96, Math.min(220, openUp ? spaceAbove : spaceBelow))
      const top = openUp
        ? Math.max(viewportMargin, bounds.top - gap - optionsHeight - 18)
        : Math.min(bounds.bottom + gap, window.innerHeight - viewportMargin - optionsHeight - 18)

      setMenuStyle({
        top,
        left,
        width: menuWidth,
        '--parent-master-select-options-max-height': `${optionsHeight}px`,
      })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const closeDropdown = () => {
      setIsOpen(false)
    }

    const handlePointerDown = (event) => {
      if (
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        closeDropdown()
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        closeDropdown()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleToggleDropdown = () => {
    if (disabled) {
      return
    }

    setIsOpen((currentState) => {
      if (currentState) {
        setMenuStyle(null)
      }

      return !currentState
    })
  }

  const displayValue = loading
    ? 'Memuat data...'
    : selectedOptions.length > 0
      ? selectedOptions.map((option) => option.label).join(', ')
      : placeholder

  const menuNode =
    isOpen && menuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="parent-master-select__menu item-create-popup__channel-menu"
            role="listbox"
            aria-label={label}
            aria-multiselectable="true"
            style={menuStyle}
          >
            <div className="parent-master-select__options item-create-popup__channel-options">
              {loading ? (
                <div className="parent-master-select__empty">Memuat data...</div>
              ) : options.length > 0 ? (
                options.map((option) => {
                  const isChecked = selectedIds.includes(option.value)

                  return (
                    <label
                      key={option.value}
                      className={[
                        'parent-master-select__option',
                        'item-create-popup__channel-option',
                        isChecked ? 'parent-master-select__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      htmlFor={`${id}-${option.value}`}
                      role="option"
                      aria-selected={isChecked}
                    >
                      <input
                        id={`${id}-${option.value}`}
                        type="checkbox"
                        className="register-user-popup__dropdown-checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={() => onToggle?.(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  )
                })
              ) : (
                <div className="parent-master-select__empty">{emptyMessage}</div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="parent-master-select item-create-popup__channel-select">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`parent-master-select__trigger${
          isOpen ? ' parent-master-select__trigger--open' : ''
        }`}
        onClick={handleToggleDropdown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span
          className={`parent-master-select__value${
            selectedOptions.length > 0 || loading ? '' : ' parent-master-select__value--placeholder'
          }`}
        >
          {displayValue}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`parent-master-select__chevron${
            isOpen ? ' parent-master-select__chevron--open' : ''
          }`}
        />
      </button>

      {menuNode}
    </div>
  )
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

    let isMounted = true
    const controller = new AbortController()

    const loadMasterOptions = async () => {
      setIsLoadingMasters(true)

      try {
        const [uoms, items] = await Promise.all([
          api.uoms.list({ is_active: 1 }, { signal: controller.signal }),
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
          uoms: normalizeMasterOptions(uoms),
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
    setErrorMessage('')
    setFormValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: value,
        ...(name === 'business_unit_id' ? { department_id: [] } : {}),
      }

      return nextValues
    })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    handleFieldChange(name, value)
  }

  const handleDepartmentToggle = (departmentId) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const selectedDepartmentIds = getSelectedDepartmentIds(currentValues.department_id)
      const normalizedDepartmentId = String(departmentId)
      const isSelected = selectedDepartmentIds.includes(normalizedDepartmentId)

      return {
        ...currentValues,
        department_id: isSelected
          ? selectedDepartmentIds.filter((selectedId) => selectedId !== normalizedDepartmentId)
          : [...selectedDepartmentIds, normalizedDepartmentId],
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload(formValues, masterOptions)

    if (!hasRequiredValues(payload)) {
      setErrorMessage('Lengkapi item name terlebih dahulu.')
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

  const headerTitle = formValues.item_name || title

  const renderField = (field) => (
    <div
      key={field.name}
      className={`register-user-popup__field${
        field.full ? ' register-user-popup__field--full' : ''
      }${
        field.compactDimension ? ' item-create-popup__field--compact-dimension' : ''
      }${
        field.qtyField ? ' item-create-popup__field--qty' : ''
      }`}
    >
      <label className="register-user-popup__label" htmlFor={`item-${field.name}`}>
        {field.label}
        {field.required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
      </label>
      {field.type === 'checkbox-list' ? (
        <ChannelCheckboxSelect
          id={`item-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          emptyMessage={field.emptyMessage}
          loading={field.name === 'department_id' && isLoadingDepartments}
          disabled={
            isSubmitting ||
            isLoadingMasters ||
            (field.name === 'department_id' && !formValues.business_unit_id)
          }
          onToggle={handleDepartmentToggle}
        />
      ) : field.type === 'select' ? (
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
        <div className={field.unitSuffix ? 'item-create-popup__input-with-unit' : undefined}>
          <input
            id={`item-${field.name}`}
            name={field.name}
            className={`register-user-popup__input${
              field.readOnly ? ' register-user-popup__input--readonly' : ''
            }${field.unitSuffix ? ' item-create-popup__input--with-unit' : ''}`}
            type={field.type === 'number' ? 'number' : 'text'}
            step={field.type === 'number' ? 'any' : undefined}
            value={formValues[field.name]}
            placeholder={field.placeholder}
            onChange={handleInputChange}
            disabled={isSubmitting}
            readOnly={field.readOnly}
            aria-readonly={field.readOnly ? 'true' : undefined}
          />
          {field.unitSuffix ? (
            <span className="item-create-popup__unit" aria-hidden="true">
              {field.unitSuffix}
            </span>
          ) : null}
        </div>
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
        aria-labelledby="dialog-create-item-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-item-title">
              {headerTitle}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close item-create-popup__close-button"
            aria-label="Tutup dialog"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={22} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div className="parent-create-popup__section">
                  <div className="register-user-popup__grid" style={{ rowGap: '12px', marginBottom: '12px' }}>
                    {itemFields
                      .filter((field) =>
                        [
                          'item_name',
                          'variant',
                        ].includes(field.name),
                      )
                      .map(renderField)}
                  </div>
                </div>

                <div className="parent-create-popup__section item-create-popup__dimension-backdrop">
                  <div className="parent-create-popup__section-header">
                    <h3 className="parent-create-popup__section-title">Dimency Item</h3>
                    <p className="parent-create-popup__section-description">
                      Lengkapi detail dimensi item mulai dari UOM sampai lead time.
                    </p>
                  </div>

                  <div className="register-user-popup__grid item-create-popup__dimension-grid" style={{ rowGap: '12px' }}>
                    {itemFields
                      .filter((f) =>
                        [
                          'uom_id',
                          'qty_per_pack',
                          'height',
                          'width',
                          'depth',
                          'gross_weight_pack',
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
