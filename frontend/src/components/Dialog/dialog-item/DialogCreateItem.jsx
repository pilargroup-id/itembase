import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, RefreshCw05, Trash03, XClose } from '../../template/TemplateIcons.jsx'
import SearchableItemSelect from './SearchableItemSelect.jsx'

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
    placeholder: 'Pilih Parent',
    type: 'select',
    optionsKey: 'parents',
    searchPlaceholder: 'Cari Parent...',
    emptyMessage: 'Parent tidak ditemukan.',
    fullRow: true,
  },
  {
    name: 'item_name',
    label: 'Item Name',
    placeholder: 'Masukan Item Name',
    required: true,
    half: true,
  },
  {
    name: 'selling_name',
    label: 'Selling Name (Editable)',
    placeholder: 'Masukan Selling Name',
    half: true,
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
    label: 'Gross Weight / Pack',
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
  variantAttributes: [],
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

function getPaginationMeta(responseData, rows) {
  const meta = responseData?.meta ?? responseData?.data?.meta ?? {}
  const page = Number(meta.page ?? meta.current_page ?? 1)
  const limit = Number(meta.limit ?? meta.per_page ?? rows.length)
  const total = Number(meta.total ?? meta.total_data ?? rows.length)
  const totalPages = Number(
    meta.totalPages ?? meta.total_page ?? meta.totalPage ?? meta.total_pages ?? meta.last_page,
  )
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : rows.length || 1
  const safeTotal = Number.isInteger(total) && total >= 0 ? total : rows.length

  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: safeLimit,
    total: safeTotal,
    totalPages: Number.isInteger(totalPages) && totalPages > 0
      ? totalPages
      : Math.max(1, Math.ceil(safeTotal / safeLimit)),
  }
}

function hasPaginationMeta(responseData) {
  return Boolean(responseData?.meta || responseData?.data?.meta)
}

async function fetchAllActiveParents(options) {
  const limit = 250
  const parentMap = new Map()
  let currentPage = 1

  while (true) {
    const previousParentCount = parentMap.size
    const response = await api.itemParents.list(
      { status: 'active', page: currentPage, limit, sort: 'name-asc' },
      options,
    )
    const rows = normalizeListResponse(response)
    const meta = getPaginationMeta(response, rows)

    rows.forEach((parent) => {
      const parentId = parent?.id

      if (parentId !== undefined && parentId !== null && parentId !== '') {
        parentMap.set(String(parentId), parent)
      }
    })

    const totalPages = hasPaginationMeta(response)
      ? meta.totalPages
      : rows.length === limit
        ? currentPage + 1
        : currentPage

    if (rows.length === 0 || parentMap.size === previousParentCount) {
      break
    }

    currentPage += 1

    if (currentPage > totalPages) {
      break
    }
  }

  return Array.from(parentMap.values())
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
        parent.parent_name || parent.item_name,
        parent.parent_code,
      ])

      return {
        ...option,
        itemName: String(parent.item_name ?? ''),
        variantAttributes: normalizeVariantAttributes(parent.variant_attributes),
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
      })),
  }
}

function hasRequiredValues(payload) {
  if (!payload.item_kind || !payload.item_name) {
    return false
  }

  return true
}

function hasIncompleteMatrixSelection(variantAttributes, variantSelections) {
  return variantAttributes.some(
    (attribute) => getSelectedIds(variantSelections[attribute.value]).length === 0,
  )
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
  const [isPreviewingMatrix, setIsPreviewingMatrix] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [itemOptionRows, setItemOptionRows] = useState([])
  const [selectedVariantAttributeIds, setSelectedVariantAttributeIds] = useState([])
  const [variantSelections, setVariantSelections] = useState({})
  const [variantValueOptionsByAttributeId, setVariantValueOptionsByAttributeId] = useState({})
  const [loadingVariantValuesByAttributeId, setLoadingVariantValuesByAttributeId] = useState({})
  const [matrixRows, setMatrixRows] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setIsPreviewingMatrix(false)
    setMasterOptions((currentOptions) => ({
      ...currentOptions,
      departments: [],
    }))
    setSelectedVariantAttributeIds([])
    setVariantSelections({})
    setVariantValueOptionsByAttributeId({})
    setLoadingVariantValuesByAttributeId({})
    setMatrixRows([])
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
        let parents = []
        let businessUnits = []
        let variantAttributes = []

        try {
          parents = await fetchAllActiveParents({ signal: controller.signal })
        } catch (error) {
          if (error?.name === 'AbortError') {
            throw error
          }

          setErrorMessage(error?.message || 'Gagal memuat data parent.')
        }

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

        try {
          variantAttributes = await api.variants.attributes(
            { is_active: 1 },
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
          businessUnits: normalizeBusinessUnitOptions(businessUnits, itemRows),
          departments: [],
          variantAttributes: normalizeMasterOptions(variantAttributes),
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

  const selectedVariantAttributeKey = useMemo(
    () => selectedVariantAttributeIds.join('|'),
    [selectedVariantAttributeIds],
  )

  useEffect(() => {
    const attributeIds = selectedVariantAttributeKey
      ? selectedVariantAttributeKey.split('|').filter(Boolean)
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

        setErrorMessage(error?.message || 'Gagal memuat data variant value.')
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
    selectedVariantAttributeKey,
    variantValueOptionsByAttributeId,
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
    }

    if (name === 'parent_id') {
      setSelectedVariantAttributeIds([])
      setVariantSelections({})
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

  const handleVariantAttributeToggle = (attributeId) => {
    setErrorMessage('')
    setMatrixRows([])
    setSelectedVariantAttributeIds((currentIds) => {
      const normalizedAttributeId = String(attributeId ?? '')
      const isSelected = currentIds.includes(normalizedAttributeId)

      return isSelected
        ? currentIds.filter((selectedId) => selectedId !== normalizedAttributeId)
        : [...currentIds, normalizedAttributeId]
    })
  }

  const handleVariantValueToggle = (attributeId, valueId) => {
    setErrorMessage('')
    setMatrixRows([])
    setVariantSelections((currentSelections) => {
      const normalizedAttributeId = String(attributeId ?? '')
      const normalizedValueId = String(valueId ?? '')
      const selectedValueIds = getSelectedIds(currentSelections[normalizedAttributeId])
      const isSelected = selectedValueIds.includes(normalizedValueId)

      return {
        ...currentSelections,
        [normalizedAttributeId]: isSelected
          ? selectedValueIds.filter((selectedValueId) => selectedValueId !== normalizedValueId)
          : [...selectedValueIds, normalizedValueId],
      }
    })
  }

  const handlePreviewMatrix = async () => {
    if (!formValues.parent_id) {
      setErrorMessage('Pilih parent terlebih dahulu sebelum membuat matrix.')
      return
    }

    const activeVariantAttributes =
      masterOptions.variantAttributes.filter((attribute) =>
        selectedVariantAttributeIds.includes(attribute.value),
      )

    if (activeVariantAttributes.length === 0) {
      setErrorMessage('Pilih minimal satu variant attribute untuk membuat matrix.')
      return
    }

    if (hasIncompleteMatrixSelection(activeVariantAttributes, variantSelections)) {
      setErrorMessage('Pilih minimal satu value untuk setiap variant attribute.')
      return
    }

    setIsPreviewingMatrix(true)
    setErrorMessage('')

    try {
      const response = await api.items.matrixPreview({
        item_parent_id: formValues.parent_id,
        attributes: activeVariantAttributes.map((attribute) => ({
          attribute_id: attribute.value,
          value_ids: getSelectedIds(variantSelections[attribute.value]),
        })),
      })
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
        })),
      )
    } catch (error) {
      setMatrixRows([])
      setErrorMessage(error?.message || 'Gagal membuat preview matrix.')
    } finally {
      setIsPreviewingMatrix(false)
    }
  }

  const handleMatrixRowChange = (rowId, fieldName, value) => {
    setErrorMessage('')
    setMatrixRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [fieldName]: value,
            }
          : row,
      ),
    )
  }

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

  const handleMatrixRowRemove = (rowId) => {
    setErrorMessage('')
    setMatrixRows((currentRows) => currentRows.filter((row) => row.id !== rowId))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const activeVariantAttributes =
        masterOptions.variantAttributes.filter((attribute) =>
          selectedVariantAttributeIds.includes(attribute.value),
        )

      if (activeVariantAttributes.length > 0) {
        const payload = buildMatrixPayload(formValues, matrixRows)
        const hasInvalidMatrixRow = payload.items.some(
          (item) => !item.item_name || item.variants.length === 0,
        )

        if (!payload.item_parent_id) {
          setErrorMessage('Pilih parent terlebih dahulu sebelum membuat matrix item.')
          return
        }

        if (payload.items.length === 0) {
          setErrorMessage('Preview matrix dan pilih minimal satu item untuk dibuat.')
          return
        }

        if (hasInvalidMatrixRow) {
          setErrorMessage('Lengkapi item name pada preview matrix.')
          return
        }

        const createdItems = await api.items.createMatrix(payload)

        onCreated?.(createdItems)
        handleClose()
        return
      }

      const payload = buildPayload(formValues, masterOptions)

      if (!hasRequiredValues(payload)) {
        setErrorMessage('Lengkapi item name terlebih dahulu.')
        return
      }

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
  const activeVariantAttributes =
    masterOptions.variantAttributes.filter((attribute) =>
      selectedVariantAttributeIds.includes(attribute.value),
    )
  const selectedMatrixRows = matrixRows.filter((row) => row.create)
  const isMatrixMode = activeVariantAttributes.length > 0
  const isLoadingAnyVariantValue = Object.values(loadingVariantValuesByAttributeId).some(Boolean)
  const canPreviewMatrix =
    isMatrixMode &&
    Boolean(formValues.parent_id) &&
    !isSubmitting &&
    !isPreviewingMatrix &&
    !isLoadingAnyVariantValue &&
    !hasIncompleteMatrixSelection(activeVariantAttributes, variantSelections)

  const renderVariantMatrix = () => {
    return (
      <div className="parent-create-popup__section item-create-popup__matrix-panel">
        <div className="parent-create-popup__section-header item-create-popup__matrix-header">
          <div>
            <h3 className="parent-create-popup__section-title">Variant Matrix</h3>
            <p className="parent-create-popup__section-description">
              Pilih attribute dan value untuk membuat beberapa item berbeda variant.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary item-create-popup__matrix-preview-button"
            disabled={!canPreviewMatrix}
            onClick={handlePreviewMatrix}
          >
            <RefreshCw05 size={16} aria-hidden="true" />
            <span>{isPreviewingMatrix ? 'Previewing...' : 'Preview'}</span>
          </button>
        </div>

        <div className="register-user-popup__field item-create-popup__variant-attribute-field">
          <label
            className="register-user-popup__label"
            htmlFor="item-variant-attributes"
          >
            Variant Attribute
          </label>
          <ChannelCheckboxSelect
            id="item-variant-attributes"
            label="Variant Attribute"
            value={selectedVariantAttributeIds}
            options={masterOptions.variantAttributes}
            placeholder="Pilih Attribute"
            emptyMessage="Attribute tidak ditemukan."
            loading={isLoadingMasters}
            disabled={
              isSubmitting ||
              isLoadingMasters ||
              !formValues.parent_id
            }
            onToggle={handleVariantAttributeToggle}
          />
          {!formValues.parent_id ? (
            <p className="item-create-popup__matrix-note">
              Pilih parent terlebih dahulu untuk membuat matrix item.
            </p>
          ) : (
            <p className="item-create-popup__matrix-note">
              Pilih attribute dari master untuk membuat matrix item.
            </p>
          )}
        </div>

        <div className="item-create-popup__variant-grid">
          {activeVariantAttributes.length > 0 ? activeVariantAttributes.map((attribute) => (
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
                placeholder={`Pilih ${attribute.label}`}
                emptyMessage="Value tidak ditemukan."
                loading={Boolean(loadingVariantValuesByAttributeId[attribute.value])}
                disabled={isSubmitting || Boolean(loadingVariantValuesByAttributeId[attribute.value])}
                onToggle={(valueId) => handleVariantValueToggle(attribute.value, valueId)}
              />
            </div>
          )) : (
            <p className="register-user-popup__hint item-create-popup__variant-empty">
              Pilih variant attribute untuk menampilkan value.
            </p>
          )}
        </div>

        <div className="item-create-popup__matrix-preview">
          <div className="item-create-popup__matrix-summary">
            <span>{matrixRows.length} preview item</span>
            <span>{selectedMatrixRows.length} dipilih</span>
          </div>

          {matrixRows.length > 0 ? (
            <div className="item-create-popup__matrix-table-wrap">
              <table className="item-create-popup__matrix-table">
                <thead>
                  <tr>
                    <th>Create</th>
                    <th>Variant</th>
                    <th>Item Name</th>
                    <th>Selling Name</th>
                    <th aria-label="Aksi" />
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.id} className={row.create ? '' : 'item-create-popup__matrix-row--muted'}>
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
                      <td>
                        <input
                          className="register-user-popup__input item-create-popup__matrix-input"
                          value={row.item_name}
                          disabled={isSubmitting || !row.create}
                          onChange={(event) =>
                            handleMatrixRowChange(row.id, 'item_name', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="register-user-popup__input item-create-popup__matrix-input"
                          value={row.selling_name}
                          disabled={isSubmitting || !row.create}
                          onChange={(event) =>
                            handleMatrixRowChange(row.id, 'selling_name', event.target.value)
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="item-create-popup__matrix-delete"
                          aria-label={`Hapus ${row.variant_summary || row.row_no}`}
                          disabled={isSubmitting}
                          onClick={() => handleMatrixRowRemove(row.id)}
                        >
                          <Trash03 size={16} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="register-user-popup__hint">
              Preview item akan muncul di sini setelah value dipilih.
            </p>
          )}
        </div>
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
              field.readOnly || (field.name === 'item_name' && formValues.parent_id)
                ? ' register-user-popup__input--readonly'
                : ''
            }${field.unitSuffix ? ' item-create-popup__input--with-unit' : ''}`}
            type={field.type === 'number' ? 'number' : 'text'}
            step={field.type === 'number' ? 'any' : undefined}
            value={formValues[field.name]}
            placeholder={field.placeholder}
            onChange={handleInputChange}
            disabled={isSubmitting}
            readOnly={field.readOnly || (field.name === 'item_name' && Boolean(formValues.parent_id))}
            aria-readonly={
              field.readOnly || (field.name === 'item_name' && formValues.parent_id)
                ? 'true'
                : undefined
            }
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
                  <div className="register-user-popup__grid item-create-popup__identity-grid" style={{ rowGap: '12px', marginBottom: '12px' }}>
                    {itemFields
                      .filter((field) =>
                        [
                          'parent_id',
                          'item_name',
                          'selling_name',
                        ].includes(field.name),
                      )
                      .map(renderField)}
                  </div>
                </div>

                {renderVariantMatrix()}

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
            disabled={isSubmitting || isPreviewingMatrix}
          >
            {isSubmitting
              ? 'Creating...'
              : isMatrixMode
                ? `Create ${selectedMatrixRows.length || ''}`.trim()
                : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateItem
