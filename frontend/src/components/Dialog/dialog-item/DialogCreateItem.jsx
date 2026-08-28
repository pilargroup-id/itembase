import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, Plus, SearchMd, XClose, XCircle } from '../../template/TemplateIcons.jsx'
import DialogEditItem from './DialogEditItem.jsx'
import SearchableItemSelect from './SearchableItemSelect.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'

const DUPLICATE_VARIANT_ITEM_CODE_PATTERN = /variant combination already exists on item\s+(\S+)/i

function parseDuplicateVariantItemCode(message) {
  const match = DUPLICATE_VARIANT_ITEM_CODE_PATTERN.exec(String(message ?? ''))

  return match ? match[1].replace(/[.,]+$/, '') : null
}

const initialFormValues = {
  item_kind: 'regular',
  parent_id: '',
  item_name: '',
  selling_name: '',
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
    name: 'parent_id',
    label: 'Parent',
    placeholder: 'Select Parent',
    type: 'select',
    optionsKey: 'parents',
    searchPlaceholder: 'Search Parent...',
    emptyMessage: 'Parent not found.',
    half: true,
    searchTrigger: true,
  },
  {
    name: 'item_name',
    label: 'SKU Name',
    placeholder: 'Enter Item Name',
    required: true,
    half: true,
  },
  {
    name: 'selling_name',
    label: 'Selling Name (Editable)',
    placeholder: 'Enter Selling Name',
    half: true,
  },
  {
    name: 'uom_id',
    label: 'UOM',
    placeholder: 'Select UOM',
    type: 'select',
    optionsKey: 'uoms',
    searchPlaceholder: 'Search UOM...',
    emptyMessage: 'UOM not found.',
    forceOpenDown: true,
    allowCreate: true,
    searchTrigger: true,
  },
  {
    name: 'qty_per_pack',
    label: 'Qty / Pack',
    placeholder: '0',
    type: 'number',
    compactDimension: true,
    qtyField: true,
  },
  {
    name: 'height',
    label: 'Height',
    placeholder: '0',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'width',
    label: 'Width',
    placeholder: '0',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'depth',
    label: 'Depth',
    placeholder: '0',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'cm',
  },
  {
    name: 'gross_weight_pack',
    label: 'G.Weight / Pack',
    placeholder: '0.00',
    type: 'number',
    compactDimension: true,
  },
  {
    name: 'production_time_days',
    label: 'Lead Time',
    placeholder: '0',
    type: 'number',
    compactDimension: true,
    unitSuffix: 'day',
  },
]

const dimensionFieldNames = [
  'uom_id',
  'qty_per_pack',
  'height',
  'width',
  'depth',
  'gross_weight_pack',
  'production_time_days',
]

const dimensionFields = itemFields.filter((field) => dimensionFieldNames.includes(field.name))

const emptyMatrixRowDimensionValues = Object.fromEntries(
  dimensionFieldNames.map((fieldName) => [fieldName, '']),
)

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
  parents: [],
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

function getSelectedIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = String(value ?? '').trim()

  return normalizedValue ? [normalizedValue] : []
}

function getSelectedOptionsInOrder(value, options) {
  const selectedIds = getSelectedIds(value)

  return selectedIds
    .map((selectedId) => options.find((option) => option.value === selectedId))
    .filter(Boolean)
}

function buildCodeFromName(name) {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function toTitleCase(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(
      /(^|[\s/-])([a-z])/g,
      (match, separator, letter) => `${separator}${letter.toUpperCase()}`,
    )
}

function normalizeMasterOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((item) => makeOption(item.id ?? item.value, [item.name, item.code]))
    .filter((option) => option.value && option.label)
}

function getResourceData(responseData) {
  return responseData?.data && !Array.isArray(responseData.data)
    ? responseData.data
    : responseData
}

function normalizeVariantAttributes(attributes) {
  return Array.isArray(attributes)
    ? [...attributes]
        .map((attribute, index) => {
          const id = attribute?.attribute_id ?? attribute?.id ?? attribute?.value
          const label = attribute?.name ?? attribute?.attribute_name ?? attribute?.code ?? id

          return {
            value: String(id ?? ''),
            label: String(label ?? ''),
            code: String(attribute?.code ?? attribute?.attribute_code ?? ''),
            sortOrder: Number(attribute?.sort_order ?? index + 1),
          }
        })
        .filter((attribute) => attribute.value && attribute.label)
        .sort((firstAttribute, secondAttribute) => firstAttribute.sortOrder - secondAttribute.sortOrder)
    : []
}

function normalizeParentOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((parent) => {
      const option = makeOption(parent.id, [
        parent.label,
        parent.parent_name || parent.item_name,
        parent.parent_code,
      ])

      return {
        ...option,
        itemName: String(parent.item_name ?? ''),
      }
    })
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

function buildCommonValues(formValues) {
  const commonFieldNames = [
    'uom_id',
    'qty_per_pack',
    'height',
    'width',
    'depth',
    'gross_weight_pack',
    'production_time_days',
    'is_active',
  ]

  return Object.fromEntries(
    commonFieldNames
      .map((fieldName) => {
        const trimmedValue = String(formValues[fieldName] ?? '').trim()

        if (trimmedValue === '') {
          return [fieldName, '']
        }

        return [
          fieldName,
          numericFields.has(fieldName) ? Number(trimmedValue) : trimmedValue,
        ]
      })
      .filter(([, value]) => value !== ''),
  )
}

function buildRowDimensionValues(row) {
  return Object.fromEntries(
    dimensionFieldNames
      .map((fieldName) => {
        const trimmedValue = String(row[fieldName] ?? '').trim()

        if (trimmedValue === '') {
          return [fieldName, '']
        }

        return [
          fieldName,
          numericFields.has(fieldName) ? Number(trimmedValue) : trimmedValue,
        ]
      })
      .filter(([, value]) => value !== ''),
  )
}

function buildMatrixPayload(formValues, matrixRows) {
  return {
    item_parent_id: formValues.parent_id,
    common_values: buildCommonValues(formValues),
    items: matrixRows
      .filter((row) => row.create)
      .map((row) => ({
        item_name: String(row.item_name ?? '').trim(),
        selling_name: String(row.selling_name ?? '').trim(),
        variants: (row.variants ?? []).map((variant) => ({
          attribute_id: variant.attribute_id,
          value_id: variant.value_id,
        })),
        ...buildRowDimensionValues(row),
      })),
  }
}

function hasRequiredValues(payload) {
  if (!payload.item_kind || !payload.item_name) {
    return false
  }

  return true
}

const MAX_VARIANT_VALUES_PER_ATTRIBUTE = 5

function hasIncompleteMatrixSelection(variantAttributes, variantSelections) {
  return variantAttributes.some(
    (attribute) => getSelectedIds(variantSelections[attribute.value]).length === 0,
  )
}

function normalizeMatrixText(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function buildMatrixVariantKey(variants) {
  return (Array.isArray(variants) ? variants : [])
    .map((variant) => `${variant?.attribute_id ?? ''}:${variant?.value_id ?? ''}`)
    .sort()
    .join('|')
}

function buildMatrixRowDuplicateKey(row) {
  const variantKey = buildMatrixVariantKey(row.variants)

  return variantKey ? `${normalizeMatrixText(row.item_name)}__${variantKey}` : ''
}

function getDuplicateMatrixRowIds(rows) {
  const enabledRows = rows.filter((row) => row.create)
  const keyCounts = new Map()

  enabledRows.forEach((row) => {
    const key = buildMatrixRowDuplicateKey(row)

    if (key) {
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1)
    }
  })

  const duplicateIds = new Set()

  enabledRows.forEach((row) => {
    const key = buildMatrixRowDuplicateKey(row)

    if (key && keyCounts.get(key) > 1) {
      duplicateIds.add(row.id)
    }
  })

  return duplicateIds
}

function hasDuplicateMatrixRows(rows) {
  return getDuplicateMatrixRowIds(rows).size > 0
}

function ChannelCheckboxSelect({
  id,
  label,
  value = [],
  options = [],
  placeholder = 'Select data',
  searchPlaceholder = 'Search data...',
  emptyMessage = 'No data found.',
  loading = false,
  disabled = false,
  maxSelectable,
  allowCreate = false,
  uppercase = false,
  onCreate,
  onToggle,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingOption, setIsCreatingOption] = useState(false)
  const [createOptionError, setCreateOptionError] = useState('')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const selectedIds = getSelectedDepartmentIds(value)
  const selectedOptions = getSelectedOptionsInOrder(selectedIds, options)
  const trimmedQuery = searchQuery.trim()
  const normalizedQuery = trimmedQuery.toLowerCase()
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        String(option.searchText || option.label).toLowerCase().includes(normalizedQuery),
      )
    : options
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const canCreateOption = allowCreate && Boolean(onCreate) && Boolean(trimmedQuery) && !hasExactMatch

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
      setSearchQuery('')
      setCreateOptionError('')
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

  const handleFocusTrigger = () => {
    if (disabled) {
      return
    }

    setIsOpen(true)
  }

  const handleSearchInputChange = (event) => {
    const nextValue = uppercase ? event.target.value.toUpperCase() : event.target.value

    setSearchQuery(nextValue)
    setCreateOptionError('')
    setIsOpen(true)
  }

  const handleCreateOption = async () => {
    if (!canCreateOption || isCreatingOption) {
      return
    }

    setIsCreatingOption(true)
    setCreateOptionError('')

    try {
      const newOption = await onCreate(trimmedQuery)

      if (newOption?.value) {
        onToggle?.(newOption.value)
        setSearchQuery('')
        triggerRef.current?.focus()
      }
    } catch (error) {
      setCreateOptionError(error?.message || 'Failed to add data.')
    } finally {
      setIsCreatingOption(false)
    }
  }

  const selectedLabel = selectedOptions
    .map((option) => (uppercase ? option.label.toUpperCase() : option.label))
    .join(', ')
  const inputValue = isOpen ? searchQuery : loading ? 'Loading data...' : selectedLabel
  const inputPlaceholder = loading ? 'Loading data...' : isOpen ? searchPlaceholder : placeholder

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
                <div className="parent-master-select__empty">Loading data...</div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isChecked = selectedIds.includes(option.value)
                  const isLimitReached =
                    !isChecked &&
                    typeof maxSelectable === 'number' &&
                    selectedIds.length >= maxSelectable
                  const isOptionDisabled = disabled || isLimitReached

                  return (
                    <label
                      key={option.value}
                      className={[
                        'parent-master-select__option',
                        'item-create-popup__channel-option',
                        isChecked ? 'parent-master-select__option--selected' : '',
                        isLimitReached ? 'parent-master-select__option--disabled' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      htmlFor={`${id}-${option.value}`}
                      role="option"
                      aria-selected={isChecked}
                      aria-disabled={isOptionDisabled || undefined}
                    >
                      <input
                        id={`${id}-${option.value}`}
                        type="checkbox"
                        className="register-user-popup__dropdown-checkbox"
                        checked={isChecked}
                        disabled={isOptionDisabled}
                        onChange={() => onToggle?.(option.value)}
                      />
                      <span>{uppercase ? option.label.toUpperCase() : option.label}</span>
                    </label>
                  )
                })
              ) : (
                <div className="parent-master-select__empty">{emptyMessage}</div>
              )}
            </div>

            {canCreateOption ? (
              <div className="parent-master-select__create">
                <button
                  type="button"
                  className="parent-master-select__create-button"
                  onClick={handleCreateOption}
                  disabled={isCreatingOption}
                >
                  <Plus size={14} aria-hidden="true" />
                  <span>{isCreatingOption ? 'Adding...' : `Add "${trimmedQuery}"`}</span>
                </button>
                {createOptionError ? (
                  <p className="parent-master-select__create-error" role="alert">
                    {createOptionError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="parent-subbrand-search item-create-popup__channel-select">
      <div className="parent-subbrand-search__control">
        <SearchMd size={16} className="parent-subbrand-search__icon" aria-hidden="true" />
        <input
          ref={triggerRef}
          id={id}
          type="search"
          className="register-user-popup__input parent-subbrand-search__input"
          value={inputValue}
          placeholder={inputPlaceholder}
          onFocus={handleFocusTrigger}
          onChange={handleSearchInputChange}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled || loading}
        />
      </div>

      {menuNode}
    </div>
  )
}

function ValidationAlertBanner({
  message,
  variantAttributeLabels = [],
  onDismiss,
  onViewItem,
  isViewLoading = false,
}) {
  if (!message) {
    return null
  }

  const duplicateItemCode = parseDuplicateVariantItemCode(message)
  const isDuplicateVariant = Boolean(duplicateItemCode)
  const title = isDuplicateVariant ? 'Kombinasi varian sudah ada' : 'Gagal'
  const description = isDuplicateVariant
    ? `Kombinasi ${
        variantAttributeLabels.length > 0 ? variantAttributeLabels.join(', ') : 'varian'
      } yang Anda pilih sudah tersedia pada item ${duplicateItemCode}.`
    : message

  return (
    <div className="item-create-popup__validation-alert" role="alert">
      <span className="item-create-popup__validation-alert-icon" aria-hidden="true">
        <XCircle size={18} />
      </span>

      <div className="item-create-popup__validation-alert-body">
        <p className="item-create-popup__validation-alert-title">{title}</p>
        <p className="item-create-popup__validation-alert-message">{description}</p>
      </div>

      <div className="item-create-popup__validation-alert-actions">
        {isDuplicateVariant ? (
          <>
            <button
              type="button"
              className="item-create-popup__validation-alert-view-button"
              onClick={() => onViewItem?.(duplicateItemCode)}
              disabled={isViewLoading}
            >
              {isViewLoading ? 'Memuat...' : 'Lihat Item'}
            </button>
            <span className="item-create-popup__validation-alert-divider" aria-hidden="true" />
          </>
        ) : null}

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

function DialogCreateItem({
  isOpen = false,
  eyebrow = 'Create SKU',
  title = 'Create SKU',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [isLoadingParentOptions, setIsLoadingParentOptions] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [isPreviewingMatrix, setIsPreviewingMatrix] = useState(false)
  const [isLoadingParentConfig, setIsLoadingParentConfig] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [itemOptionRows, setItemOptionRows] = useState([])
  const [parentSearchQuery, setParentSearchQuery] = useState('')
  const [parentVariantAttributes, setParentVariantAttributes] = useState([])
  const [variantSelections, setVariantSelections] = useState({})
  const [variantValueOptionsByAttributeId, setVariantValueOptionsByAttributeId] = useState({})
  const [loadingVariantValuesByAttributeId, setLoadingVariantValuesByAttributeId] = useState({})
  const [matrixRows, setMatrixRows] = useState([])
  const [syncAllDimensions, setSyncAllDimensions] = useState(false)
  const [isParentSectionOpen, setIsParentSectionOpen] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [viewItemTarget, setViewItemTarget] = useState(null)
  const [isLoadingViewItem, setIsLoadingViewItem] = useState(false)
  const { notifySuccess } = useAlertAction()

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setIsPreviewingMatrix(false)
    setParentSearchQuery('')
    setMasterOptions((currentOptions) => ({
      ...currentOptions,
      parents: [],
      departments: [],
    }))
    setParentVariantAttributes([])
    setVariantSelections({})
    setVariantValueOptionsByAttributeId({})
    setLoadingVariantValuesByAttributeId({})
    setMatrixRows([])
    setSyncAllDimensions(false)
    setIsParentSectionOpen(true)
    setErrorMessage('')
    setViewItemTarget(null)
    setIsLoadingViewItem(false)
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
        setMasterOptions((currentOptions) => ({
          parents: currentOptions.parents,
          uoms: normalizeMasterOptions(uoms),
          businessUnits: normalizeBusinessUnitOptions(businessUnits, itemRows),
          departments: [],
        }))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
        setErrorMessage(error?.message || 'Failed to load item master data.')
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
        setErrorMessage(error?.message || 'Failed to load parent data.')
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
    if (!isOpen || !formValues.parent_id) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadParentConfig = async () => {
      setIsLoadingParentConfig(true)

      try {
        const response = await api.itemParents.itemConfig(formValues.parent_id, {
          signal: controller.signal,
        })

        if (!isMounted) {
          return
        }

        const parentConfig = getResourceData(response)

        setParentVariantAttributes(normalizeVariantAttributes(parentConfig?.variant_attributes))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setParentVariantAttributes([])
        setErrorMessage(error?.message || 'Failed to load parent configuration.')
      } finally {
        if (isMounted) {
          setIsLoadingParentConfig(false)
        }
      }
    }

    loadParentConfig()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [isOpen, formValues.parent_id])

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
        setErrorMessage(error?.message || 'Failed to load channel data.')
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

  const duplicateMatrixRowIds = useMemo(() => getDuplicateMatrixRowIds(matrixRows), [matrixRows])
  const hasDuplicateMatrixSelection = duplicateMatrixRowIds.size > 0

  const selectedParentOption = useMemo(
    () =>
      masterOptions.parents.find(
        (option) => option.value === String(formValues.parent_id ?? ''),
      ),
    [masterOptions.parents, formValues.parent_id],
  )
  const activeVariantAttributes = parentVariantAttributes
  const activeVariantAttributeKey = useMemo(
    () => activeVariantAttributes.map((attribute) => attribute.value).join('|'),
    [activeVariantAttributes],
  )

  useEffect(() => {
    const attributeIds = activeVariantAttributeKey
      ? activeVariantAttributeKey.split('|').filter(Boolean)
      : []

    if (!isOpen || attributeIds.length === 0) {
      return undefined
    }

    const missingAttributeIds = attributeIds.filter(
      (attributeId) => !variantValueOptionsByAttributeId[attributeId],
    )

    if (missingAttributeIds.length === 0) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadVariantValues = async () => {
      setLoadingVariantValuesByAttributeId((currentValues) => ({
        ...currentValues,
        ...Object.fromEntries(missingAttributeIds.map((attributeId) => [attributeId, true])),
      }))

      return Promise.all(
        missingAttributeIds.map(async (attributeId) => {
          const response = await api.variants.values(
            { attribute_id: attributeId, is_active: 1 },
            { signal: controller.signal },
          )

          return [attributeId, normalizeMasterOptions(response)]
        }),
      )
    }

    loadVariantValues()
      .then((entries) => {
        if (!isMounted) {
          return
        }

        setVariantValueOptionsByAttributeId((currentOptions) => ({
          ...currentOptions,
          ...Object.fromEntries(entries),
        }))
      })
      .catch((error) => {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setErrorMessage(error?.message || 'Failed to load variant value data.')
      })
      .finally(() => {
        if (!isMounted) {
          return
        }

        setLoadingVariantValuesByAttributeId((currentValues) => ({
          ...currentValues,
          ...Object.fromEntries(missingAttributeIds.map((attributeId) => [attributeId, false])),
        }))
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [
    isOpen,
    activeVariantAttributeKey,
    variantValueOptionsByAttributeId,
  ])

  const isLoadingAnyVariantValue = useMemo(
    () => Object.values(loadingVariantValuesByAttributeId).some(Boolean),
    [loadingVariantValuesByAttributeId],
  )

  useEffect(() => {
    if (
      !isOpen ||
      !formValues.parent_id ||
      activeVariantAttributes.length === 0 ||
      isLoadingParentConfig ||
      isLoadingAnyVariantValue ||
      hasIncompleteMatrixSelection(activeVariantAttributes, variantSelections)
    ) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const generateMatrixPreview = async () => {
      setIsPreviewingMatrix(true)
      setErrorMessage('')

      try {
        const response = await api.items.matrixPreview(
          {
            item_parent_id: formValues.parent_id,
            attributes: activeVariantAttributes.map((attribute) => ({
              attribute_id: attribute.value,
              value_ids: getSelectedIds(variantSelections[attribute.value]),
            })),
          },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        const previewData = getResourceData(response)
        const combinations = Array.isArray(previewData?.combinations)
          ? previewData.combinations
          : []

        setMatrixRows(
          combinations.map((combination, index) => ({
            id: `${combination.row_no ?? index + 1}-${combination.variant_summary ?? index}`,
            create: true,
            row_no: combination.row_no ?? index + 1,
            variant_summary: combination.variant_summary ?? '',
            item_name: combination.suggested_item_name ?? '',
            selling_name: combination.suggested_selling_name ?? '',
            variants: Array.isArray(combination.variants) ? combination.variants : [],
            ...emptyMatrixRowDimensionValues,
          })),
        )
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMatrixRows([])
        setErrorMessage(error?.message || 'Failed to generate matrix preview.')
      } finally {
        if (isMounted) {
          setIsPreviewingMatrix(false)
        }
      }
    }

    generateMatrixPreview()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [
    isOpen,
    formValues.parent_id,
    activeVariantAttributes,
    variantSelections,
    isLoadingParentConfig,
    isLoadingAnyVariantValue,
  ])

  const handleFieldChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const selectedParent =
        name === 'parent_id'
          ? masterOptions.parents.find((option) => option.value === String(value ?? ''))
          : null
      const nextItemName =
        name === 'parent_id'
          ? selectedParent?.itemName || ''
          : name === 'item_name'
            ? value
            : currentValues.item_name
      const nextValues = {
        ...currentValues,
        [name]: value,
        ...(name === 'parent_id' ? { item_name: nextItemName } : {}),
        ...(
          name === 'parent_id' || name === 'item_name'
            ? { selling_name: toTitleCase(nextItemName) }
            : {}
        ),
        ...(name === 'business_unit_id' ? { department_id: [] } : {}),
      }

      return nextValues
    })

    if (name === 'parent_id' || name === 'item_name') {
      setMatrixRows([])
      setSyncAllDimensions(false)
    }

    if (name === 'parent_id') {
      setParentVariantAttributes([])
      setVariantSelections({})

      if (!value) {
        setIsParentSectionOpen(true)
      }
    }
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

  const handleVariantValueToggle = (attributeId, valueId) => {
    const normalizedAttributeId = String(attributeId ?? '')
    const normalizedValueId = String(valueId ?? '')
    const selectedValueIds = getSelectedIds(variantSelections[normalizedAttributeId])
    const isSelected = selectedValueIds.includes(normalizedValueId)

    if (!isSelected && selectedValueIds.length >= MAX_VARIANT_VALUES_PER_ATTRIBUTE) {
      setErrorMessage(
        `Maximum ${MAX_VARIANT_VALUES_PER_ATTRIBUTE} values per variant attribute.`,
      )
      return
    }

    setErrorMessage('')
    setMatrixRows([])
    setSyncAllDimensions(false)
    setVariantSelections((currentSelections) => {
      const currentSelectedValueIds = getSelectedIds(currentSelections[normalizedAttributeId])
      const isCurrentlySelected = currentSelectedValueIds.includes(normalizedValueId)

      return {
        ...currentSelections,
        [normalizedAttributeId]: isCurrentlySelected
          ? currentSelectedValueIds.filter(
              (selectedValueId) => selectedValueId !== normalizedValueId,
            )
          : [...currentSelectedValueIds, normalizedValueId],
      }
    })
  }

  const handleCreateUom = useCallback(async (name) => {
    const trimmedName = String(name ?? '').trim()

    if (!trimmedName) {
      return null
    }

    const existingOption = masterOptions.uoms.find(
      (option) => option.label.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (existingOption) {
      return existingOption
    }

    const response = await api.uoms.create({
      code: buildCodeFromName(trimmedName) || trimmedName.slice(0, 50),
      name: trimmedName,
      is_active: 1,
    })
    const newOption = normalizeMasterOptions([getResourceData(response)])[0]

    if (newOption) {
      setMasterOptions((currentOptions) => ({
        ...currentOptions,
        uoms: [...currentOptions.uoms, newOption],
      }))
    }

    return newOption ?? null
  }, [masterOptions.uoms])

  const handleCreateVariantValue = useCallback(async (attributeId, name) => {
    const trimmedName = String(name ?? '').trim().toUpperCase()

    if (!trimmedName) {
      return null
    }

    const existingOptions = variantValueOptionsByAttributeId[attributeId] || []
    const existingOption = existingOptions.find(
      (option) => option.label.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (existingOption) {
      return existingOption
    }

    const response = await api.variantValue.create({
      attribute_id: attributeId,
      name: trimmedName,
      sort_order: existingOptions.length + 1,
      is_active: 1,
    })
    const newOption = normalizeMasterOptions([getResourceData(response)])[0]

    if (newOption) {
      setVariantValueOptionsByAttributeId((currentOptions) => ({
        ...currentOptions,
        [attributeId]: [...(currentOptions[attributeId] || []), newOption],
      }))
    }

    return newOption ?? null
  }, [variantValueOptionsByAttributeId])

  const handleMatrixRowChange = (rowId, fieldName, value) => {
    setErrorMessage('')
    setMatrixRows((currentRows) => {
      const isFirstRow = currentRows[0]?.id === rowId
      const shouldSyncDimension =
        syncAllDimensions && isFirstRow && dimensionFieldNames.includes(fieldName)

      return currentRows.map((row) => {
        if (row.id === rowId) {
          return { ...row, [fieldName]: value }
        }

        if (shouldSyncDimension) {
          return { ...row, [fieldName]: value }
        }

        return row
      })
    })
  }

  const handleSyncAllDimensionsToggle = (event) => {
    const checked = event.target.checked

    setErrorMessage('')
    setSyncAllDimensions(checked)

    if (checked) {
      setMatrixRows((currentRows) => {
        if (currentRows.length <= 1) {
          return currentRows
        }

        const firstRowDimensionValues = Object.fromEntries(
          dimensionFieldNames.map((fieldName) => [fieldName, currentRows[0][fieldName]]),
        )

        return currentRows.map((row, index) =>
          index === 0 ? row : { ...row, ...firstRowDimensionValues },
        )
      })
    }
  }

  const handleToggleParentSection = () => {
    setIsParentSectionOpen((currentValue) => !currentValue)
  }

  const handleViewDuplicateItem = useCallback(async (itemCode) => {
    if (!itemCode) {
      return
    }

    setIsLoadingViewItem(true)

    try {
      const response = await api.items.list({ item_code: itemCode, limit: 1 })
      const [matchedItem] = normalizeListResponse(response)

      if (matchedItem) {
        setViewItemTarget(matchedItem)
      } else {
        setErrorMessage(`Item ${itemCode} not found.`)
      }
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to load item detail.')
    } finally {
      setIsLoadingViewItem(false)
    }
  }, [])

  const handleMatrixRowToggle = (rowId) => {
    setErrorMessage('')
    setMatrixRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              create: !row.create,
            }
          : row,
      ),
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      if (activeVariantAttributes.length > 0) {
        const payload = buildMatrixPayload(formValues, matrixRows)
        const hasInvalidMatrixRow = payload.items.some(
          (item) => !item.item_name || item.variants.length === 0,
        )

        if (!payload.item_parent_id) {
          setErrorMessage('Select a parent first before creating matrix items.')
          return
        }

        if (payload.items.length === 0) {
          setErrorMessage('Preview the matrix and select at least one item to create.')
          return
        }

        if (hasInvalidMatrixRow) {
          setErrorMessage('Complete the item name in the matrix preview.')
          return
        }

        if (hasDuplicateMatrixRows(matrixRows)) {
          setErrorMessage(
            'There are SKUs with the same Item Name + Variant combination. Change the item name or variant of one SKU to avoid duplication.',
          )
          return
        }

        const createdItems = await api.items.createMatrix(payload)

        onCreated?.(createdItems)
        notifySuccess('SKU created successfully.')
        handleClose()
        return
      }

      const payload = buildPayload(formValues, masterOptions)

      if (!hasRequiredValues(payload)) {
        setErrorMessage('Please enter the item name first.')
        return
      }

      const createdItem = await api.items.create(payload)

      onCreated?.(createdItem)
      notifySuccess('SKU created successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to create item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  const headerTitle = formValues.item_name || title
  const selectedMatrixRows = matrixRows.filter((row) => row.create)
  const isMatrixMode = activeVariantAttributes.length > 0
  const selectedParentItemName = selectedParentOption?.itemName

  const isFieldReadOnly = (field) =>
    field.readOnly ||
    (field.name === 'item_name' &&
      Boolean(formValues.parent_id) &&
      Boolean(selectedParentItemName))

  const renderVariantMatrix = () => {
    const hasParent = Boolean(formValues.parent_id)
    const isLoadingAttributes = hasParent && isLoadingParentConfig && activeVariantAttributes.length === 0
    const hasAttributes = hasParent && activeVariantAttributes.length > 0

    return (
      <div className="parent-create-popup__section item-create-popup__matrix-panel">
        <div className="parent-create-popup__section-header parent-detail-item__top">
          {hasParent ? (
            <div>
              <h3 className="parent-create-popup__section-title">Variant Matrix</h3>
              <p className="parent-create-popup__section-description">
                Pratinjau item akan muncul di sini setelah nilai dipilih.
              </p>
            </div>
          ) : null}

          {hasParent ? (
            <div className="parent-detail-item__actions">
              <button
                type="button"
                className="parent-detail-item__toggle-parent"
                onClick={handleToggleParentSection}
                disabled={isSubmitting}
                aria-expanded={isParentSectionOpen}
                title={isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}
                aria-label={isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}
              >
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={`parent-detail-item__toggle-parent-chevron${
                    isParentSectionOpen ? ' parent-detail-item__toggle-parent-chevron--open' : ''
                  }`}
                />
                <span>{isParentSectionOpen ? 'Hide Parent' : 'Show Parent'}</span>
              </button>
            </div>
          ) : null}
        </div>

        {!hasParent ? (
          <div className="item-create-popup__matrix-empty">
            <p className="register-user-popup__hint">
              Pilih parent terlebih dahulu untuk menampilkan variant matrix.
            </p>
          </div>
        ) : isLoadingAttributes ? (
          <div className="item-create-popup__matrix-empty">
            <p className="register-user-popup__hint">Loading parent variant attributes...</p>
          </div>
        ) : !hasAttributes ? (
          <div className="item-create-popup__matrix-empty">
            <p className="register-user-popup__hint">This parent has no variant attributes.</p>
          </div>
        ) : (
          <>
            <div className="item-create-popup__variant-grid">
              {activeVariantAttributes.map((attribute) => (
                <div key={attribute.value} className="register-user-popup__field">
                  <label
                    className="register-user-popup__label"
                    htmlFor={`item-variant-${attribute.value}`}
                  >
                    {attribute.label}
                  </label>
                  <ChannelCheckboxSelect
                    id={`item-variant-${attribute.value}`}
                    label={attribute.label}
                    value={variantSelections[attribute.value] || []}
                    options={variantValueOptionsByAttributeId[attribute.value] || []}
                    placeholder={`Select ${attribute.label}`}
                    searchPlaceholder={`Search ${attribute.label}...`}
                    emptyMessage="Value not found."
                    loading={Boolean(loadingVariantValuesByAttributeId[attribute.value])}
                    disabled={isSubmitting || Boolean(loadingVariantValuesByAttributeId[attribute.value])}
                    maxSelectable={MAX_VARIANT_VALUES_PER_ATTRIBUTE}
                    allowCreate
                    uppercase
                    onCreate={(name) => handleCreateVariantValue(attribute.value, name)}
                    onToggle={(valueId) => handleVariantValueToggle(attribute.value, valueId)}
                  />
                </div>
              ))}
            </div>

            <div className="item-create-popup__matrix-preview">
              <div className="item-create-popup__matrix-summary">
                <span>{matrixRows.length} preview item</span>
                <span>{selectedMatrixRows.length} selected</span>

                {matrixRows.length > 1 ? (
                  <label
                    className="item-create-popup__matrix-sync-toggle"
                    title="Isi dimensi carton di baris pertama, baris lain otomatis mengikuti."
                  >
                    <input
                      type="checkbox"
                      className="register-user-popup__dropdown-checkbox"
                      checked={syncAllDimensions}
                      disabled={isSubmitting}
                      onChange={handleSyncAllDimensionsToggle}
                    />
                    <span>Samakan dimensi carton</span>
                  </label>
                ) : null}
              </div>

              {hasDuplicateMatrixSelection ? (
                <p
                  className="register-user-popup__hint item-create-popup__matrix-duplicate-hint"
                  role="alert"
                >
                  There are SKUs with the same Item Name + Variant combination. Change the item name or
                  variant of one SKU to avoid duplication.
                </p>
              ) : null}

              {matrixRows.length > 0 ? (
                <div className="item-create-popup__matrix-table-wrap">
                  <table className="item-create-popup__matrix-table">
                    <thead>
                      <tr>
                        <th>Create</th>
                        <th>Variant</th>
                        <th className="item-create-popup__matrix-th--name">SKU Name</th>
                        {dimensionFields.map((field) => (
                          <th key={field.name}>
                            {field.label}
                            {field.unitSuffix ? ` (${field.unitSuffix})` : ''}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrixRows.map((row, rowIndex) => {
                        const isDuplicateRow = duplicateMatrixRowIds.has(row.id)
                        const isSyncedFollowerRow = syncAllDimensions && rowIndex > 0

                        return (
                          <tr
                            key={row.id}
                            className={[
                              !row.create ? 'item-create-popup__matrix-row--muted' : '',
                              isDuplicateRow ? 'item-create-popup__matrix-row--duplicate' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="register-user-popup__dropdown-checkbox"
                                checked={row.create}
                                disabled={isSubmitting}
                                onChange={() => handleMatrixRowToggle(row.id)}
                                aria-label={`Create ${row.variant_summary || row.row_no}`}
                              />
                            </td>
                            <td>
                              <span className="item-create-popup__matrix-variant">
                                {row.variant_summary || '-'}
                              </span>
                            </td>
                            <td className="item-create-popup__matrix-td--name">
                              <input
                                className="register-user-popup__input item-create-popup__matrix-input"
                                value={row.item_name}
                                disabled={isSubmitting || !row.create}
                                onChange={(event) =>
                                  handleMatrixRowChange(row.id, 'item_name', event.target.value)
                                }
                              />
                              {isDuplicateRow ? (
                                <p
                                  className="item-create-popup__matrix-duplicate-note"
                                  role="alert"
                                >
                                  Duplicate Item Name + Variant
                                </p>
                              ) : null}
                            </td>
                            {dimensionFields.map((field) => (
                              <td
                                key={field.name}
                                className={`item-create-popup__dimension-cell item-create-popup__dimension-cell--${field.name}${
                                  isSyncedFollowerRow
                                    ? ' item-create-popup__dimension-cell--synced'
                                    : ''
                                }`}
                              >
                                {field.type === 'select' ? (
                                  <SearchableItemSelect
                                    id={`item-matrix-${row.id}-${field.name}`}
                                    label={field.label}
                                    value={row[field.name]}
                                    options={masterOptions[field.optionsKey]}
                                    placeholder={field.placeholder}
                                    searchPlaceholder={field.searchPlaceholder}
                                    emptyMessage={field.emptyMessage}
                                    loading={isLoadingMasters}
                                    disabled={
                                      isSubmitting ||
                                      isLoadingMasters ||
                                      !row.create ||
                                      isSyncedFollowerRow
                                    }
                                    forceOpenDown={Boolean(field.forceOpenDown)}
                                    allowCreate={Boolean(field.allowCreate)}
                                    searchTrigger={Boolean(field.searchTrigger)}
                                    onCreate={field.name === 'uom_id' ? handleCreateUom : undefined}
                                    onChange={(nextValue) =>
                                      handleMatrixRowChange(row.id, field.name, nextValue)
                                    }
                                  />
                                ) : (
                                  <input
                                    className="register-user-popup__input item-create-popup__dimension-input"
                                    type="number"
                                    step="any"
                                    value={row[field.name]}
                                    placeholder={field.placeholder}
                                    disabled={isSubmitting || !row.create || isSyncedFollowerRow}
                                    onChange={(event) =>
                                      handleMatrixRowChange(row.id, field.name, event.target.value)
                                    }
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="register-user-popup__hint">
                  Item preview will appear here once values are selected.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  const renderField = (field) => (
    <div
      key={field.name}
      className={`register-user-popup__field${
        field.full ? ' register-user-popup__field--full' : ''
      }${
        field.fullRow ? ' item-create-popup__field--full-row' : ''
      }${
        field.half ? ' item-create-popup__field--half' : ''
      }${
        field.compactDimension ? ' item-create-popup__field--compact-dimension' : ''
      }${
        field.qtyField ? ' item-create-popup__field--qty' : ''
      }${
        field.name ? ` item-create-popup__field--${field.name}` : ''
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
            field.name === 'parent_id'
              ? isLoadingParentOptions && !formValues.parent_id
              : field.name === 'department_id'
              ? isLoadingDepartments
              : isLoadingMasters
          }
          disabled={
            isSubmitting ||
            (field.name !== 'parent_id' && isLoadingMasters) ||
            (field.name === 'department_id' && !formValues.business_unit_id)
          }
          remoteSearch={field.name === 'parent_id'}
          onSearchChange={
            field.name === 'parent_id'
              ? setParentSearchQuery
              : undefined
          }
          searchTrigger={Boolean(field.searchTrigger)}
          onChange={(nextValue) => handleFieldChange(field.name, nextValue)}
        />
      ) : (
        <div className={field.unitSuffix ? 'item-create-popup__input-with-unit' : undefined}>
          <input
            id={`item-${field.name}`}
            name={field.name}
            className={`register-user-popup__input${
              isFieldReadOnly(field)
                ? ' register-user-popup__input--readonly'
                : ''
            }${field.unitSuffix ? ' item-create-popup__input--with-unit' : ''}`}
            type={field.type === 'number' ? 'number' : 'text'}
            step={field.type === 'number' ? 'any' : undefined}
            value={formValues[field.name]}
            placeholder={field.placeholder}
            onChange={handleInputChange}
            disabled={isSubmitting}
            readOnly={isFieldReadOnly(field)}
            aria-readonly={isFieldReadOnly(field) ? 'true' : undefined}
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
      <ValidationAlertBanner
        message={errorMessage}
        variantAttributeLabels={activeVariantAttributes.map((attribute) => attribute.label)}
        onDismiss={() => setErrorMessage('')}
        onViewItem={handleViewDuplicateItem}
        isViewLoading={isLoadingViewItem}
      />

      <form
        className={`dashboard-popup register-user-popup mtickets-create-popup parent-create-popup item-create-popup${
          formValues.parent_id ? '' : ' item-create-popup--compact'
        }${
          matrixRows.length > 0 ? ' item-create-popup--matrix' : ''
        }`}
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
            aria-label="Close dialog"
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
                <div
                  className={`parent-create-popup__collapsible${
                    isParentSectionOpen ? '' : ' parent-create-popup__collapsible--collapsed'
                  }`}
                >
                  <div className="parent-create-popup__collapsible-inner">
                    <div className="parent-create-popup__section">
                      <div className="register-user-popup__grid item-create-popup__identity-grid" style={{ rowGap: '12px' }}>
                        {itemFields
                          .filter((field) =>
                            [
                              'parent_id',
                            ].includes(field.name),
                          )
                          .map(renderField)}
                      </div>
                    </div>
                  </div>
                </div>

                {renderVariantMatrix()}

                {matrixRows.length > 0 ? (
                  <p className="parent-create-popup__section-description item-create-popup__matrix-footnote">
                    Pilih nilai varian, lalu isi dimensi karton tiap item pada tabel di atas.
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
            disabled={
              isSubmitting ||
              isPreviewingMatrix ||
              (isMatrixMode && hasDuplicateMatrixSelection)
            }
          >
            {isSubmitting
              ? 'Creating...'
              : isMatrixMode
                ? selectedMatrixRows.length > 0
                  ? `Create SKU (${selectedMatrixRows.length})`
                  : 'Create SKU'
                : 'Create SKU'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateItem
