import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, Plus, SearchMd, XClose, XCircle } from '../../template/TemplateIcons.jsx'
import CreateDetailItem, {
  createInitialDetailItem,
  hasDuplicateVariantSelection,
} from './detail-item/CreateDetailItem.jsx'
import CheckboxSelect from '../../dropdown/filter/CheckBox.jsx'

const DUPLICATE_PARENT_CODE_PATTERN = /parent combination already exists on\s+(\S+)/i

function parseDuplicateParentCode(message) {
  const match = DUPLICATE_PARENT_CODE_PATTERN.exec(String(message ?? ''))

  return match ? match[1].replace(/[.,]+$/, '') : null
}

const initialFormValues = {
  subbrand_id: '',
  brand_id: '',
  sub_brand: '',
  item_name: '',
  category_id: '',
  item_type_id: '',
  port_id: [],
  variant_attribute_ids: [],
  parent_name: '',
  status: 'active',
}

const parentFormulaFields = [
  {
    name: 'brand_id',
    label: 'Brand',
    placeholder: 'Select brand',
    type: 'select',
    optionsKey: 'brands',
    searchPlaceholder: 'Search brand...',
    emptyMessage: 'Brand not found.',
  },
  {
    name: 'sub_brand',
    label: 'Sub Brand',
    placeholder: 'Search...',
    type: 'subBrandSearch',
    searchPlaceholder: 'Search',
    emptyMessage: 'Sub brand not found.',
  },
  {
    name: 'item_name',
    label: 'Item Name',
    placeholder: 'Enter Item Name..',
  },
]

const parentDetailFields = [
  {
    name: 'category_id',
    label: 'Category',
    placeholder: 'Select category',
    type: 'select',
    optionsKey: 'categories',
    searchPlaceholder: 'Search category...',
    emptyMessage: 'Category not found.',
  },
  {
    name: 'item_type_id',
    label: 'Item Source',
    placeholder: 'Select Source',
    type: 'select',
    optionsKey: 'itemTypes',
    searchable: false,
    emptyMessage: 'Item type not found.',
  },
  {
    name: 'port_id',
    label: 'Port',
    placeholder: 'Select port',
    type: 'checkbox-list',
    optionsKey: 'ports',
    searchPlaceholder: 'Search port...',
    emptyMessage: 'Port not found.',
  },
  {
    name: 'variant_attribute_ids',
    label: 'Variant Attribute',
    placeholder: 'Select attribute',
    type: 'searchable-checkbox-list',
    optionsKey: 'variantAttributes',
    searchPlaceholder: 'Search or add attribute...',
    emptyMessage: 'Attribute not found.',
    showOrder: true,
    allowCreate: true,
  },
]

const requiredFieldNames = [
  'brand_id',
  'sub_brand',
  'item_name',
  'category_id',
  'item_type_id',
]

const masterSelectDefaults = {
  brands: {
    labelKeys: ['name', 'brand_name', 'code', 'brand_code'],
  },
  categories: {
    labelKeys: ['detail_category', 'name', 'category_name', 'sub_category', 'main_category'],
  },
  itemTypes: {
    labelKeys: ['name', 'item_type_name', 'type_name', 'code'],
  },
  ports: {
    labelKeys: ['name', 'port_name', 'code', 'port_code'],
  },
  uoms: {
    labelKeys: ['code', 'name', 'uom_code', 'uom_name'],
  },
  variantAttributes: {
    labelKeys: ['name', 'code'],
  },
  variantValues: {
    labelKeys: ['name', 'code'],
  },
}

const emptyMasterOptions = {
  brands: [],
  categories: [],
  itemTypes: [],
  ports: [],
  uoms: [],
  variantAttributes: [],
}

function normalizeListResponse(responseData) {
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

function getFirstFilledValue(item, keys) {
  const matchedKey = keys.find((key) => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== '')

  return matchedKey ? item[matchedKey] : ''
}

function normalizeFieldValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function buildCodeFromName(name) {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50)
}

function getOptionLabel(options, value) {
  const normalizedValue = String(value ?? '')

  return options.find((option) => option.value === normalizedValue)?.label ?? ''
}

function buildParentName({ brandLabel = '', subBrand = '', itemName = '' }) {
  return [brandLabel, subBrand, itemName]
    .map(normalizeFieldValue)
    .filter(Boolean)
    .join(' ')
}

function buildParentPorts(portIds) {
  const selectedPortIds = Array.isArray(portIds)
    ? portIds.map((portId) => normalizeFieldValue(portId)).filter(Boolean)
    : normalizeFieldValue(portIds)
      ? [normalizeFieldValue(portIds)]
      : []

  return selectedPortIds.map((portId, index) => ({
    port_id: portId,
    is_primary: index === 0 ? 1 : 0,
    sort_order: index + 1,
  }))
}

function getSelectedIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFieldValue(item)).filter(Boolean)
  }

  const normalizedValue = normalizeFieldValue(value)

  return normalizedValue ? [normalizedValue] : []
}

function buildParentVariantAttributes(attributeIds) {
  return getSelectedIds(attributeIds).map((attributeId, index) => ({
    attribute_id: attributeId,
    sort_order: index + 1,
  }))
}

function hasIncompleteDetailVariantSelection(detailItems, attributeIds) {
  const selectedAttributeIds = getSelectedIds(attributeIds)

  if (selectedAttributeIds.length === 0) {
    return false
  }

  return detailItems
    .filter((item) => item.create !== false)
    .some(
      (item) => selectedAttributeIds.some(
        (attributeId) => !normalizeFieldValue(item.variant_values_by_attribute_id?.[attributeId]),
      ),
    )
}

function getCreatedParentId(parent) {
  return parent?.id ?? parent?.parent_id ?? parent?.item_parent_id ?? ''
}

function findDuplicateParentMatch(parents, { subBrand, itemName, excludeId }) {
  const normalizedSubBrand = normalizeFieldValue(subBrand).toLowerCase()
  const normalizedItemName = normalizeFieldValue(itemName).toLowerCase()

  return (
    parents.find((parent) => {
      const parentId = getCreatedParentId(parent)

      if (excludeId && String(parentId) === String(excludeId)) {
        return false
      }

      return (
        normalizeFieldValue(parent.sub_brand).toLowerCase() === normalizedSubBrand &&
        normalizeFieldValue(parent.item_name).toLowerCase() === normalizedItemName
      )
    }) || null
  )
}

function getApiErrorMessage(error, fallbackMessage) {
  const responseErrors = error?.data?.errors

  if (responseErrors && typeof responseErrors === 'object' && !Array.isArray(responseErrors)) {
    const fieldMessage = Object.values(responseErrors).find(
      (value) => typeof value === 'string' && value.trim(),
    )

    if (fieldMessage) {
      return fieldMessage
    }
  }

  return error?.message || fallbackMessage
}

function getHwdParts(value) {
  const parts = String(value ?? '')
    .split(/\s*x\s*/i)
    .map((part) => normalizeFieldValue(part))

  return [parts[0] ?? '', parts[1] ?? '', parts[2] ?? '']
}

function normalizeNumberPayloadValue(value) {
  const normalizedValue = normalizeFieldValue(value)

  if (!normalizedValue) {
    return undefined
  }

  const numberValue = Number(normalizedValue)

  return Number.isFinite(numberValue) ? numberValue : undefined
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== ''),
  )
}

function buildDetailItemPayloads(detailItems, itemName, parentId, attributeIds) {
  const selectedAttributeIds = getSelectedIds(attributeIds)

  return detailItems
    .filter((detailItem) => detailItem.create !== false)
    .map((detailItem) => {
      const normalizedItemName = normalizeFieldValue(itemName)
      const normalizedVariant = normalizeFieldValue(detailItem.item_variant)
      const [height, width, depth] = getHwdParts(detailItem.hwd)
      const payload = compactPayload({
        item_kind: 'regular',
        parent_id: parentId,
        item_name: normalizedVariant
          ? `${normalizedItemName} ${normalizedVariant}`
          : normalizedItemName,
        selling_name: normalizedVariant
          ? `${normalizedItemName} ${normalizedVariant}`
          : normalizedItemName,
        uom_id: normalizeFieldValue(detailItem.uom_id),
        height: normalizeNumberPayloadValue(height),
        width: normalizeNumberPayloadValue(width),
        depth: normalizeNumberPayloadValue(depth),
        production_time_days: normalizeNumberPayloadValue(detailItem.lead_time_days),
        is_active: 1,
      })

      const variants = selectedAttributeIds
        .map((attributeId) => ({
          attribute_id: attributeId,
          value_id: normalizeFieldValue(detailItem.variant_values_by_attribute_id?.[attributeId]),
        }))
        .filter((variant) => variant.value_id)

      if (variants.length > 0) {
        payload.variants = variants
      }

      return payload
    })
}

function getResourceData(responseData) {
  return responseData?.data && !Array.isArray(responseData.data)
    ? responseData.data
    : responseData
}

function normalizeMasterOptions(responseData, optionsKey) {
  const config = masterSelectDefaults[optionsKey] ?? { labelKeys: ['name'] }

  return normalizeListResponse(responseData)
    .map((item) => {
      const value = getFirstFilledValue(item, ['id', 'value'])
      const label = getFirstFilledValue(item, config.labelKeys)
      const code = getFirstFilledValue(item, ['code', 'brand_code', 'category_code', 'item_type_code', 'port_code'])
      const labelText = label || code || value

      return {
        value: String(value ?? ''),
        label: String(labelText ?? ''),
        searchText: [labelText, code, value].filter(Boolean).join(' '),
      }
    })
    .filter((option) => option.value && option.label)
}

function normalizeSubbrandOptions(responseData) {
  const optionsByKey = new Map()

  normalizeListResponse(responseData).forEach((item) => {
    const subbrandId = getFirstFilledValue(item, ['subbrand_id', 'id', 'value'])
    const subBrand = getFirstFilledValue(item, ['sub_brand', 'name', 'label'])
    const parentName = getFirstFilledValue(item, ['parent_name', 'item_name'])
    const score = getFirstFilledValue(item, ['score'])
    const label = String(subBrand || '').trim()

    if (!label) {
      return
    }

    const value = String(subbrandId || label)
    const existingOption = optionsByKey.get(value)

    if (existingOption && Number(existingOption.score || 0) >= Number(score || 0)) {
      return
    }

    optionsByKey.set(value, {
      value,
      subbrand_id: String(subbrandId || ''),
      sub_brand: label,
      label,
      parentName: String(parentName || ''),
      score,
      searchText: [label, parentName, score].filter(Boolean).join(' '),
    })
  })

  return Array.from(optionsByKey.values())
}

function formatSubbrandScore(score) {
  if (score === undefined || score === null || score === '') {
    return ''
  }

  const numericScore = Number(score)

  if (!Number.isFinite(numericScore)) {
    return String(score)
  }

  return numericScore.toLocaleString('id-ID', {
    maximumFractionDigits: 2,
  })
}

function DuplicateParentAlertBanner({ duplicateParentMatch, onDismiss }) {
  if (!duplicateParentMatch) {
    return null
  }

  return (
    <div className="item-create-popup__validation-alert" role="alert">
      <span className="item-create-popup__validation-alert-icon" aria-hidden="true">
        <XCircle size={18} />
      </span>

      <div className="item-create-popup__validation-alert-body">
        <p className="item-create-popup__validation-alert-title">Parent sudah ada</p>
        <p className="item-create-popup__validation-alert-message">
          Parent dengan kombinasi Brand + Sub Brand + Item Name ini sudah ada (
          <strong>{duplicateParentMatch.parent_code}</strong>).
        </p>
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

function ParentValidationAlertBanner({ message, onDismiss }) {
  if (!message) {
    return null
  }

  const duplicateParentCode = parseDuplicateParentCode(message)
  const isDuplicate = Boolean(duplicateParentCode)
  const title = isDuplicate ? 'Parent sudah ada' : 'Gagal'
  const description = isDuplicate ? (
    <>
      Parent dengan kombinasi Brand + Sub Brand + Item Name ini sudah ada (<strong>{duplicateParentCode}</strong>).
    </>
  ) : (
    message
  )

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

function SearchableMasterSelect({
  id,
  label,
  value = '',
  options = [],
  placeholder = 'Select data',
  searchPlaceholder = 'Search data...',
  emptyMessage = 'No data found.',
  loading = false,
  disabled = false,
  searchable = true,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const selectedValue = String(value ?? '')
  const selectedOption = options.find((option) => option.value === selectedValue)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!searchable || !normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      String(option.searchText || option.label).toLowerCase().includes(normalizedQuery),
    )
  }, [options, searchQuery, searchable])

  const updateMenuPosition = useCallback(() => {
    const triggerElement = triggerRef.current

    if (!triggerElement) {
      return
    }

    const triggerBounds = triggerElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const viewportMargin = 12
    const menuGap = 8
    const menuChromeHeight = searchable ? 72 : 18
    const maxOptionsHeight = 220
    const maxMenuWidth = Math.max(0, viewportWidth - viewportMargin * 2)
    const menuWidth = Math.min(triggerBounds.width, maxMenuWidth)
    const nextLeft = Math.min(
      Math.max(triggerBounds.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - menuWidth - viewportMargin),
    )
    const spaceBelow = viewportHeight - triggerBounds.bottom - viewportMargin - menuGap
    const spaceAbove = triggerBounds.top - viewportMargin - menuGap
    const shouldOpenUp = spaceBelow < 190 && spaceAbove > spaceBelow
    const availableHeight = Math.max(132, shouldOpenUp ? spaceAbove : spaceBelow)
    const nextOptionsHeight = Math.max(
      96,
      Math.min(maxOptionsHeight, availableHeight - menuChromeHeight),
    )
    const menuHeight = nextOptionsHeight + menuChromeHeight
    const nextTop = shouldOpenUp
      ? Math.max(viewportMargin, triggerBounds.top - menuGap - menuHeight)
      : Math.min(triggerBounds.bottom + menuGap, viewportHeight - viewportMargin - menuHeight)

    setMenuStyle({
      top: nextTop,
      left: nextLeft,
      width: menuWidth,
      '--parent-master-select-options-max-height': `${nextOptionsHeight}px`,
    })
  }, [searchable])

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined
    }

    updateMenuPosition()

    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const closeDropdown = () => {
      setIsOpen(false)
      setSearchQuery('')
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

  useEffect(() => {
    if (searchable && isOpen && menuStyle) {
      searchInputRef.current?.focus()
    }
  }, [isOpen, menuStyle, searchable])

  const handleToggle = () => {
    if (disabled) {
      return
    }

    if (isOpen) {
      setSearchQuery('')
    }

    setIsOpen((currentState) => !currentState)
  }

  const handleSelect = (nextValue) => {
    onChange?.(nextValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  const displayValue = loading ? 'Loading data...' : selectedOption?.label || placeholder
  const menuNode =
    isOpen && menuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="parent-master-select__menu"
            role="listbox"
            aria-label={label}
            style={menuStyle}
          >
            {searchable ? (
              <div className="parent-master-select__search">
                <SearchMd size={16} className="parent-master-select__search-icon" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="parent-master-select__search-input"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label}`}
                />
              </div>
            ) : null}

            <div className="parent-master-select__options">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === selectedValue

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'parent-master-select__option',
                        isSelected ? 'parent-master-select__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelect(option.value)}
                    >
                      {option.label}
                    </button>
                  )
                })
              ) : (
                <div className="parent-master-select__empty">
                  {loading ? 'Loading data...' : emptyMessage}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="parent-master-select">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`parent-master-select__trigger${isOpen ? ' parent-master-select__trigger--open' : ''}`}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className={`parent-master-select__value${selectedOption ? '' : ' parent-master-select__value--placeholder'}`}>
          {displayValue}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`parent-master-select__chevron${isOpen ? ' parent-master-select__chevron--open' : ''}`}
        />
      </button>

      {menuNode}
    </div>
  )
}

function SearchableSubBrandInput({
  id,
  label,
  value = '',
  placeholder = 'Search sub brand',
  searchPlaceholder = 'Search sub brand...',
  emptyMessage = 'Sub brand not found.',
  disabled = false,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [options, setOptions] = useState([])
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const normalizedValue = normalizeFieldValue(value)

  const updateMenuPosition = useCallback(() => {
    const inputElement = inputRef.current

    if (!inputElement) {
      return
    }

    const inputBounds = inputElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const viewportMargin = 12
    const menuGap = 8
    const menuChromeHeight = 18
    const maxOptionsHeight = 220
    const maxMenuWidth = Math.max(0, viewportWidth - viewportMargin * 2)
    const menuWidth = Math.min(inputBounds.width, maxMenuWidth)
    const nextLeft = Math.min(
      Math.max(inputBounds.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - menuWidth - viewportMargin),
    )
    const spaceBelow = viewportHeight - inputBounds.bottom - viewportMargin - menuGap
    const spaceAbove = inputBounds.top - viewportMargin - menuGap
    const shouldOpenUp = spaceBelow < 160 && spaceAbove > spaceBelow
    const availableHeight = Math.max(112, shouldOpenUp ? spaceAbove : spaceBelow)
    const nextOptionsHeight = Math.max(
      96,
      Math.min(maxOptionsHeight, availableHeight - menuChromeHeight),
    )
    const menuHeight = nextOptionsHeight + menuChromeHeight
    const nextTop = shouldOpenUp
      ? Math.max(viewportMargin, inputBounds.top - menuGap - menuHeight)
      : Math.min(inputBounds.bottom + menuGap, viewportHeight - viewportMargin - menuHeight)

    setMenuStyle({
      top: nextTop,
      left: nextLeft,
      width: menuWidth,
      '--parent-master-select-options-max-height': `${nextOptionsHeight}px`,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined
    }

    updateMenuPosition()

    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

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

  useEffect(() => {
    if (!isOpen || !normalizedValue) {
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const response = await api.itemParents.suggestSubbrands(
          { input: normalizedValue, limit: 30 },
          { signal: controller.signal },
        )

        setOptions(normalizeSubbrandOptions(response))
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setOptions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [isOpen, normalizedValue])

  const handleInputChange = (event) => {
    const nextValue = event.target.value

    setOptions([])
    setIsLoading(Boolean(normalizeFieldValue(nextValue)))
    onChange?.(nextValue, null)
    setIsOpen(true)
  }

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleSelect = (option) => {
    onChange?.(option.sub_brand, option)
    setOptions([])
    setIsLoading(false)
    setIsOpen(false)
  }

  const visibleOptions = normalizedValue ? options : []

  const menuNode =
    isOpen && menuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="parent-master-select__menu parent-subbrand-search__menu"
            role="listbox"
            aria-label={label}
            style={menuStyle}
          >
            <div className="parent-master-select__options">
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option) => {
                  const isSelected =
                    normalizeFieldValue(option.sub_brand).toLowerCase() ===
                    normalizedValue.toLowerCase()
                  const scoreLabel = formatSubbrandScore(option.score)

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'parent-master-select__option',
                        'parent-subbrand-search__option',
                        isSelected ? 'parent-master-select__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelect(option)}
                    >
                      <span className="parent-subbrand-search__option-row">
                        <span className="parent-subbrand-search__option-label">
                          {option.label}
                        </span>
                        {scoreLabel ? (
                          <span className="parent-subbrand-search__option-score">
                            Score {scoreLabel}
                          </span>
                        ) : null}
                      </span>
                      {option.parentName ? (
                        <span className="parent-subbrand-search__option-meta">
                          {option.parentName}
                        </span>
                      ) : null}
                    </button>
                  )
                })
              ) : (
                <div className="parent-master-select__empty">
                  {isLoading && normalizedValue
                    ? 'Loading data...'
                    : normalizedValue
                      ? emptyMessage
                      : searchPlaceholder}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <div ref={rootRef} className="parent-subbrand-search">
      <div className="parent-subbrand-search__control">
        <SearchMd size={16} className="parent-subbrand-search__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          name="sub_brand"
          type="search"
          className="register-user-popup__input parent-subbrand-search__input"
          value={value}
          placeholder={placeholder}
          onChange={handleInputChange}
          onFocus={handleFocus}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          disabled={disabled}
        />
      </div>

      {menuNode}
    </div>
  )
}

function SearchableCreatableSelect({
  id,
  label,
  value = '',
  options = [],
  placeholder = 'Search data',
  emptyMessage = 'No data found.',
  loading = false,
  disabled = false,
  allowCreate = false,
  onCreate,
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [syncedValue, setSyncedValue] = useState(null)
  const [isCreatingOption, setIsCreatingOption] = useState(false)
  const [createOptionError, setCreateOptionError] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const menuRef = useRef(null)
  const selectedValue = String(value ?? '')
  const selectedOption = options.find((option) => option.value === selectedValue) || null

  if (selectedValue !== syncedValue) {
    setSyncedValue(selectedValue)
    setInputText(selectedOption?.label ?? '')
  }

  const trimmedQuery = inputText.trim()
  const filteredOptions = useMemo(() => {
    const normalizedQuery = trimmedQuery.toLowerCase()

    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      String(option.searchText || option.label).toLowerCase().includes(normalizedQuery),
    )
  }, [options, trimmedQuery])
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const canCreateOption = allowCreate && Boolean(onCreate) && Boolean(trimmedQuery) && !hasExactMatch

  const updateMenuPosition = useCallback(() => {
    const inputElement = inputRef.current

    if (!inputElement) {
      return
    }

    const inputBounds = inputElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const viewportMargin = 12
    const menuGap = 8
    const menuChromeHeight = 18
    const maxOptionsHeight = 220
    const maxMenuWidth = Math.max(0, viewportWidth - viewportMargin * 2)
    const menuWidth = Math.min(inputBounds.width, maxMenuWidth)
    const nextLeft = Math.min(
      Math.max(inputBounds.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - menuWidth - viewportMargin),
    )
    const spaceBelow = viewportHeight - inputBounds.bottom - viewportMargin - menuGap
    const spaceAbove = inputBounds.top - viewportMargin - menuGap
    const shouldOpenUp = spaceBelow < 190 && spaceAbove > spaceBelow
    const availableHeight = Math.max(112, shouldOpenUp ? spaceAbove : spaceBelow)
    const nextOptionsHeight = Math.max(
      96,
      Math.min(maxOptionsHeight, availableHeight - menuChromeHeight),
    )
    const menuHeight = nextOptionsHeight + menuChromeHeight
    const nextTop = shouldOpenUp
      ? Math.max(viewportMargin, inputBounds.top - menuGap - menuHeight)
      : Math.min(inputBounds.bottom + menuGap, viewportHeight - viewportMargin - menuHeight)

    setMenuStyle({
      top: nextTop,
      left: nextLeft,
      width: menuWidth,
      '--parent-master-select-options-max-height': `${nextOptionsHeight}px`,
    })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined
    }

    updateMenuPosition()

    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const closeDropdown = () => {
      setIsOpen(false)
      setCreateOptionError('')
      setInputText(selectedOption?.label ?? '')
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
  }, [isOpen, selectedOption])

  const handleFocus = () => {
    if (!disabled) {
      setIsOpen(true)
    }
  }

  const handleInputChange = (event) => {
    setInputText(event.target.value)
    setCreateOptionError('')
    setIsOpen(true)
  }

  const handleSelectOption = (option) => {
    onChange?.(option.value)
    setInputText(option.label)
    setCreateOptionError('')
    setIsOpen(false)
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
        onChange?.(newOption.value)
        setInputText(newOption.label)
        setIsOpen(false)
      }
    } catch (error) {
      setCreateOptionError(error?.message || 'Failed to add data.')
    } finally {
      setIsCreatingOption(false)
    }
  }

  const menuNode =
    isOpen && menuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            className="parent-master-select__menu parent-subbrand-search__menu"
            role="listbox"
            aria-label={label}
            style={menuStyle}
          >
            <div className="parent-master-select__options">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = option.value === selectedValue

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={[
                        'parent-master-select__option',
                        isSelected ? 'parent-master-select__option--selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleSelectOption(option)}
                    >
                      {option.label}
                    </button>
                  )
                })
              ) : (
                <div className="parent-master-select__empty">
                  {loading ? 'Loading data...' : emptyMessage}
                </div>
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
    <div ref={rootRef} className="parent-subbrand-search">
      <div className="parent-subbrand-search__control">
        <SearchMd size={16} className="parent-subbrand-search__icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          className="register-user-popup__input parent-subbrand-search__input"
          value={inputText}
          placeholder={loading ? 'Loading data...' : placeholder}
          onChange={handleInputChange}
          onFocus={handleFocus}
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

function SearchableCheckboxSelect({
  id,
  label,
  value = [],
  options = [],
  placeholder = 'Select data',
  searchPlaceholder = 'Search data...',
  emptyMessage = 'No data found.',
  loading = false,
  disabled = false,
  showOrder = false,
  allowCreate = false,
  uppercase = false,
  onCreate,
  onToggle,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const [isCreatingOption, setIsCreatingOption] = useState(false)
  const [createOptionError, setCreateOptionError] = useState('')
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const selectedIds = getSelectedIds(value)
  const selectedOptions = selectedIds
    .map((selectedId) => options.find((option) => option.value === selectedId))
    .filter(Boolean)
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
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const viewportMargin = 12
      const gap = 8
      const menuWidth = Math.min(bounds.width, viewportWidth - viewportMargin * 2)
      const left = Math.min(
        Math.max(bounds.left, viewportMargin),
        Math.max(viewportMargin, viewportWidth - menuWidth - viewportMargin),
      )
      const spaceBelow = viewportHeight - bounds.bottom - viewportMargin - gap
      const spaceAbove = bounds.top - viewportMargin - gap
      const openUp = spaceBelow < 180 && spaceAbove > spaceBelow
      const optionsHeight = Math.max(96, Math.min(220, openUp ? spaceAbove : spaceBelow))
      const top = openUp
        ? Math.max(viewportMargin, bounds.top - gap - optionsHeight - 18)
        : Math.min(bounds.bottom + gap, viewportHeight - viewportMargin - optionsHeight - 18)

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
    .map((option, index) => {
      const optionLabel = uppercase ? option.label.toUpperCase() : option.label

      return showOrder ? `${index + 1}. ${optionLabel}` : optionLabel
    })
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
                  const orderNumber = isChecked ? selectedIds.indexOf(option.value) + 1 : 0

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
                      <span>{uppercase ? option.label.toUpperCase() : option.label}</span>
                      {showOrder && orderNumber > 0 ? (
                        <span
                          className="checkbox-select__order-badge"
                          title={`Urutan ke-${orderNumber}`}
                        >
                          {orderNumber}
                        </span>
                      ) : null}
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

function DialogCreateParent({
  isOpen = false,
  eyebrow = 'Parent Name',
  title = 'Create ...',
  onClose,
  onCreated,
  onDeleted,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingParent, setIsDeletingParent] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')
  const [createdParent, setCreatedParent] = useState(null)
  const [detailItems, setDetailItems] = useState(() => [createInitialDetailItem()])
  const [variantValueOptionsByAttributeId, setVariantValueOptionsByAttributeId] = useState({})
  const [loadingVariantValuesByAttributeId, setLoadingVariantValuesByAttributeId] = useState({})
  const [isParentSectionOpen, setIsParentSectionOpen] = useState(true)
  const [previousCreatedParent, setPreviousCreatedParent] = useState(null)
  const [duplicateParentMatch, setDuplicateParentMatch] = useState(null)
  const [isCheckingDuplicateParent, setIsCheckingDuplicateParent] = useState(false)
  const [createSku, setCreateSku] = useState(false)

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setIsDeletingParent(false)
    setErrorMessage('')
    setCreatedParent(null)
    setDetailItems([createInitialDetailItem()])
    setVariantValueOptionsByAttributeId({})
    setLoadingVariantValuesByAttributeId({})
    setIsParentSectionOpen(true)
    setPreviousCreatedParent(null)
    setDuplicateParentMatch(null)
    setIsCheckingDuplicateParent(false)
    setCreateSku(false)
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  const handleCancelCreatedParent = useCallback(async () => {
    const parentId = getCreatedParentId(createdParent)

    if (!parentId) {
      handleClose()
      return
    }

    setIsDeletingParent(true)
    setErrorMessage('')

    try {
      await api.itemParents.remove(parentId)
      onDeleted?.(parentId)
      handleClose()
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Failed to delete item parent.'))
      setIsDeletingParent(false)
    }
  }, [createdParent, handleClose, onDeleted])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadMasterOptions = async () => {
      setIsLoadingMasters(true)

      try {
        const [brands, categories, itemTypes, ports, uoms, variantAttributes] = await Promise.all([
          api.brands.list({ is_active: 1 }, { signal: controller.signal }),
          api.categories.list({ is_active: 1 }, { signal: controller.signal }),
          api.itemTypes.list({ is_active: 1 }, { signal: controller.signal }),
          api.ports.list({ is_active: 1 }, { signal: controller.signal }),
          api.uoms.list({ is_active: 1 }, { signal: controller.signal }),
          api.variants.attributes({ is_active: 1 }, { signal: controller.signal }),
        ])

        if (!isMounted) {
          return
        }

        setMasterOptions({
          brands: normalizeMasterOptions(brands, 'brands'),
          categories: normalizeMasterOptions(categories, 'categories'),
          itemTypes: normalizeMasterOptions(itemTypes, 'itemTypes'),
          ports: normalizeMasterOptions(ports, 'ports'),
          uoms: normalizeMasterOptions(uoms, 'uoms'),
          variantAttributes: normalizeMasterOptions(variantAttributes, 'variantAttributes'),
        })
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
        setErrorMessage(error?.message || 'Failed to load item parent master data.')
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

  if (createdParent !== previousCreatedParent) {
    setPreviousCreatedParent(createdParent)

    if (createdParent) {
      setIsParentSectionOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen || createdParent) {
      return undefined
    }

    const brandId = normalizeFieldValue(formValues.brand_id)
    const subBrand = normalizeFieldValue(formValues.sub_brand)
    const itemName = normalizeFieldValue(formValues.item_name)

    if (!brandId || !subBrand || !itemName) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsCheckingDuplicateParent(true)

      try {
        const response = await api.itemParents.list(
          { brand_id: brandId, search: itemName, limit: 50 },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setDuplicateParentMatch(
          findDuplicateParentMatch(normalizeListResponse(response), { subBrand, itemName }),
        )
      } catch (error) {
        if (isMounted && error?.name !== 'AbortError') {
          setDuplicateParentMatch(null)
        }
      } finally {
        if (isMounted) {
          setIsCheckingDuplicateParent(false)
        }
      }
    }, 400)

    return () => {
      isMounted = false
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [isOpen, createdParent, formValues.brand_id, formValues.sub_brand, formValues.item_name])

  const selectedDetailVariantAttributeIds = useMemo(
    () => getSelectedIds(formValues.variant_attribute_ids),
    [formValues.variant_attribute_ids],
  )
  const selectedDetailVariantAttributeKey = selectedDetailVariantAttributeIds.join('|')

  useEffect(() => {
    const selectedAttributeIds = selectedDetailVariantAttributeKey
      ? selectedDetailVariantAttributeKey.split('|')
      : []

    if (!isOpen || selectedAttributeIds.length === 0) {
      return undefined
    }

    const missingAttributeIds = selectedAttributeIds.filter(
      (attributeId) => !variantValueOptionsByAttributeId[attributeId],
    )

    if (missingAttributeIds.length === 0) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    setLoadingVariantValuesByAttributeId((currentValues) => ({
      ...currentValues,
      ...Object.fromEntries(missingAttributeIds.map((attributeId) => [attributeId, true])),
    }))

    Promise.all(
      missingAttributeIds.map(async (attributeId) => {
        const response = await api.variants.values(
          { attribute_id: attributeId, is_active: 1 },
          { signal: controller.signal },
        )

        return [
          attributeId,
          normalizeMasterOptions(response, 'variantValues'),
        ]
      }),
    )
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
    selectedDetailVariantAttributeKey,
    variantValueOptionsByAttributeId,
  ])

  const selectedBrandLabel = useMemo(
    () => getOptionLabel(masterOptions.brands, formValues.brand_id),
    [formValues.brand_id, masterOptions.brands],
  )

  const generatedParentName = useMemo(
    () =>
      buildParentName({
        brandLabel: selectedBrandLabel,
        subBrand: formValues.sub_brand,
        itemName: formValues.item_name,
      }),
    [formValues.item_name, formValues.sub_brand, selectedBrandLabel],
  )
  const dialogTitle = generatedParentName || title

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setErrorMessage('')

    if (name === 'item_name') {
      setDuplicateParentMatch(null)
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: name === 'item_name' ? value.toUpperCase() : value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setErrorMessage('')

    if (name === 'brand_id') {
      setDuplicateParentMatch(null)
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleCheckboxToggle = (name, optionId) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const normalizedOptionId = String(optionId ?? '')
      const selectedOptionIds = getSelectedIds(currentValues[name])
      const isSelected = selectedOptionIds.includes(normalizedOptionId)

      return {
        ...currentValues,
        [name]: isSelected
          ? selectedOptionIds.filter((selectedOptionId) => selectedOptionId !== normalizedOptionId)
          : [...selectedOptionIds, normalizedOptionId],
      }
    })
  }

  const handleSubBrandChange = (value, option) => {
    setErrorMessage('')
    setDuplicateParentMatch(null)
    setFormValues((currentValues) => ({
      ...currentValues,
      subbrand_id: option?.subbrand_id || '',
      sub_brand: value,
    }))
  }

  const handleDetailItemsChange = (nextDetailItems) => {
    setErrorMessage('')
    setDetailItems(nextDetailItems)
  }

  const handleCreateUom = useCallback(async (name) => {
    const trimmedName = normalizeFieldValue(name)

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
    const newOption = normalizeMasterOptions([getResourceData(response)], 'uoms')[0]

    if (newOption) {
      setMasterOptions((currentOptions) => ({
        ...currentOptions,
        uoms: [...currentOptions.uoms, newOption],
      }))
    }

    return newOption ?? null
  }, [masterOptions.uoms])

  const handleCreateVariantValue = useCallback(async (attributeId, name) => {
    const trimmedName = normalizeFieldValue(name).toUpperCase()

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
    const newOption = normalizeMasterOptions([getResourceData(response)], 'variantValues')[0]

    if (newOption) {
      setVariantValueOptionsByAttributeId((currentOptions) => ({
        ...currentOptions,
        [attributeId]: [...(currentOptions[attributeId] || []), newOption],
      }))
    }

    return newOption ?? null
  }, [variantValueOptionsByAttributeId])

  const handleCreateVariantAttribute = useCallback(async (name) => {
    const trimmedName = normalizeFieldValue(name).toUpperCase()

    if (!trimmedName) {
      return null
    }

    const existingOption = masterOptions.variantAttributes.find(
      (option) => option.label.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (existingOption) {
      return existingOption
    }

    const response = await api.variantAttributes.create({
      name: trimmedName,
      is_active: 1,
    })
    const newOption = normalizeMasterOptions([getResourceData(response)], 'variantAttributes')[0]

    if (newOption) {
      setMasterOptions((currentOptions) => ({
        ...currentOptions,
        variantAttributes: [...currentOptions.variantAttributes, newOption],
      }))
    }

    return newOption ?? null
  }, [masterOptions.variantAttributes])

  const handleToggleParentSection = () => {
    setIsParentSectionOpen((currentValue) => !currentValue)
  }

  const buildPayload = () => {
    const {
      port_id: portIds,
      variant_attribute_ids: variantAttributeIds,
      ...parentValues
    } = formValues

    return {
      ...Object.fromEntries(
        Object.entries(parentValues).map(([key, value]) => [
          key,
          Array.isArray(value)
            ? value.map((item) => normalizeFieldValue(item)).filter(Boolean)
            : normalizeFieldValue(value),
        ]),
      ),
      parent_name: generatedParentName,
      status: 'active',
      ports: buildParentPorts(portIds),
      variant_attributes: buildParentVariantAttributes(variantAttributeIds),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()
    const hasEmptyRequiredValue = requiredFieldNames.some((fieldName) => {
      const value = payload[fieldName]

      return Array.isArray(value) ? value.length === 0 : !value
    })

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      if (createdParent) {
        const parentId = getCreatedParentId(createdParent)

        if (!parentId) {
          setErrorMessage('Item parent created successfully, but the parent ID was not found.')
          return
        }

        if (!payload.item_name) {
          setErrorMessage('Parent item name not found to create SKU.')
          return
        }

        if (
          getSelectedIds(formValues.variant_attribute_ids).length > 0 &&
          detailItems.filter((item) => item.create !== false).length === 0
        ) {
          setErrorMessage('Select at least one SKU from the variant matrix to create.')
          return
        }

        if (hasIncompleteDetailVariantSelection(detailItems, formValues.variant_attribute_ids)) {
          setErrorMessage('Please complete the variant value on SKU details first.')
          return
        }

        if (hasDuplicateVariantSelection(detailItems, payload.item_name)) {
          setErrorMessage('There are SKUs with the same Item Name + Variant combination. Change the variant so it is not duplicated.')
          return
        }

        const itemPayloads = buildDetailItemPayloads(
          detailItems,
          payload.item_name,
          parentId,
          formValues.variant_attribute_ids,
        )
        const createdItems = await Promise.all(
          itemPayloads.map((itemPayload) => api.items.create(itemPayload)),
        )

        onCreated?.({
          parent: createdParent,
          items: createdItems.map(getResourceData),
        })
        handleClose()
        return
      }

      if (hasEmptyRequiredValue || !payload.parent_name) {
        setErrorMessage('Please complete all item parent fields first.')
        return
      }

      if (duplicateParentMatch) {
        setErrorMessage(
          `A parent with this Brand + Sub Brand + Item Name combination already exists (${duplicateParentMatch.parent_code}).`,
        )
        return
      }

      const createdParentResponse = await api.itemParents.create(payload)
      const parentData = getResourceData(createdParentResponse)

      onCreated?.(parentData)

      if (!createSku) {
        handleClose()
        return
      }

      setCreatedParent(parentData)
      setDuplicateParentMatch(null)
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, createdParent ? 'Failed to create SKU.' : 'Failed to create item parent.'))
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

  const renderField = (field) => (
    <div
      key={field.name}
      className={`register-user-popup__field${
        field.full ? ' register-user-popup__field--full' : ''
      }`}
    >
      <label
        className="register-user-popup__label"
        htmlFor={`parent-${field.name}`}
      >
        <span>{field.label}</span>
      </label>
      {field.type === 'searchable-checkbox-list' ? (
        <SearchableCheckboxSelect
          id={`parent-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters || Boolean(createdParent)}
          showOrder={field.showOrder}
          allowCreate={field.allowCreate}
          uppercase={field.name === 'variant_attribute_ids'}
          onCreate={field.name === 'variant_attribute_ids' ? handleCreateVariantAttribute : undefined}
          onToggle={(nextValue) => handleCheckboxToggle(field.name, nextValue)}
        />
      ) : field.type === 'checkbox-list' ? (
        <CheckboxSelect
          id={`parent-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters || Boolean(createdParent)}
          showOrder={field.showOrder}
          allowCreate={field.allowCreate}
          onCreate={undefined}
          onToggle={(nextValue) => handleCheckboxToggle(field.name, nextValue)}
        />
      ) : field.type === 'select' ? (
        <SearchableMasterSelect
          id={`parent-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters || Boolean(createdParent)}
          searchable={field.searchable !== false}
          onChange={(nextValue) => handleSelectChange(field.name, nextValue)}
        />
      ) : field.type === 'subBrandSearch' ? (
        <SearchableSubBrandInput
          id={`parent-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          disabled={isSubmitting || Boolean(createdParent)}
          onChange={handleSubBrandChange}
        />
      ) : (
        <input
          id={`parent-${field.name}`}
          name={field.name}
          className={`register-user-popup__input${
            field.readOnly ? ' register-user-popup__input--readonly' : ''
          }`}
          value={field.name === 'parent_name' ? generatedParentName : formValues[field.name]}
          placeholder={field.placeholder}
          onChange={field.readOnly ? undefined : handleInputChange}
          readOnly={field.readOnly}
          aria-readonly={field.readOnly ? 'true' : undefined}
          disabled={isSubmitting || Boolean(createdParent)}
        />
      )}
      {field.helperText ? (
        <p className="parent-create-popup__field-note">{field.helperText}</p>
      ) : null}
    </div>
  )

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
    >
      <form
        className={`dashboard-popup register-user-popup mtickets-create-popup parent-create-popup${
          createdParent ? ' parent-create-popup--sku-detail' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-create-parent-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-parent-title">
              {dialogTitle}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close parent-create-popup__close"
            aria-label="Close dialog"
            onClick={handleClose}
            disabled={isSubmitting || isDeletingParent}
          >
            <XClose size={22} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <div className="register-user-popup__layout">
            <div className="register-user-popup__main">
              <div className="register-user-popup__form">
                <div
                  className={`parent-create-popup__parent-info${
                    createdParent ? ' parent-create-popup__parent-info--locked' : ''
                  }`}
                >
                  <div
                    id="parent-create-popup-parent-fields"
                    className={`parent-create-popup__collapsible${
                      isParentSectionOpen ? '' : ' parent-create-popup__collapsible--collapsed'
                    }`}
                  >
                    <div className="parent-create-popup__collapsible-inner">
                      <div className="parent-create-popup__section">
                        <div className="register-user-popup__grid parent-create-popup__grid parent-create-popup__grid--formula">
                          {parentFormulaFields.map(renderField)}
                        </div>
                        {!createdParent ? (
                          <DuplicateParentAlertBanner
                            duplicateParentMatch={duplicateParentMatch}
                            onDismiss={() => setDuplicateParentMatch(null)}
                          />
                        ) : null}
                        <ParentValidationAlertBanner
                          message={errorMessage}
                          onDismiss={() => setErrorMessage('')}
                        />
                      </div>

                      <div className="parent-create-popup__section">
                        <div className="register-user-popup__grid parent-create-popup__grid parent-create-popup__grid--detail">
                          {parentDetailFields.map(renderField)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {createdParent ? (
                  <div
                    className={`parent-create-popup__detail-reveal${
                      isParentSectionOpen ? '' : ' parent-create-popup__detail-reveal--parent-hidden'
                    }`}
                  >
                    <CreateDetailItem
                      itemName={formValues.item_name}
                      items={detailItems}
                      uomOptions={masterOptions.uoms}
                      variantAttributeOptions={masterOptions.variantAttributes.filter((attribute) =>
                        getSelectedIds(formValues.variant_attribute_ids).includes(attribute.value),
                      )}
                      getVariantValueOptions={(attributeId) =>
                        variantValueOptionsByAttributeId[String(attributeId ?? '')] || []
                      }
                      getLoadingVariantValues={(attributeId) =>
                        Boolean(loadingVariantValuesByAttributeId[String(attributeId ?? '')])
                      }
                      loadingUoms={isLoadingMasters}
                      SearchableSelect={SearchableCreatableSelect}
                      VariantMultiSelect={SearchableCheckboxSelect}
                      onCreateUom={handleCreateUom}
                      onCreateVariantValue={handleCreateVariantValue}
                      disabled={isSubmitting}
                      isParentSectionOpen={isParentSectionOpen}
                      onToggleParentSection={handleToggleParentSection}
                      onChange={handleDetailItemsChange}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-popup__actions">
          {!createdParent ? (
            <label className="parent-create-popup__create-sku-toggle">
              <input
                type="checkbox"
                className="register-user-popup__dropdown-checkbox"
                checked={createSku}
                disabled={isSubmitting}
                onChange={(event) => setCreateSku(event.target.checked)}
              />
              <span>Create SKU</span>
            </label>
          ) : null}
          {createdParent ? (
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleCancelCreatedParent}
              disabled={isSubmitting || isDeletingParent}
            >
              {isDeletingParent ? 'Deleting...' : 'Delete Parent'}
            </button>
          ) : null}
          <button
            type="submit"
            className="dashboard-popup__button dashboard-popup__button--primary"
            disabled={
              isSubmitting ||
              isDeletingParent ||
              (!createdParent && (isCheckingDuplicateParent || Boolean(duplicateParentMatch))) ||
              (Boolean(createdParent) &&
                hasDuplicateVariantSelection(detailItems, formValues.item_name))
            }
          >
            {isSubmitting
              ? 'Creating...'
              : createdParent
                ? 'Create SKU'
                : 'Create parent'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateParent
