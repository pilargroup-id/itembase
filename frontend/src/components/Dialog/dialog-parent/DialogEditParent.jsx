import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose, ChevronDown, SearchMd } from '../../template/TemplateIcons.jsx'
import CheckboxSelect from '../../dropdown/filter/CheckBox.jsx'

const initialFormValues = {
  subbrand_id: '',
  brand_id: '',
  sub_brand: '',
  item_name: '',
  category_id: '',
  item_type_id: '',
  port_id: [],
  parent_name: '',
  status: 'active',
}

const parentFormulaFields = [
  {
    name: 'brand_id',
    label: 'Brand',
    placeholder: 'Pilih brand',
    type: 'select',
    optionsKey: 'brands',
    searchPlaceholder: 'Cari brand...',
    emptyMessage: 'Brand tidak ditemukan.',
  },
  {
    name: 'sub_brand',
    label: 'Sub Brand',
    placeholder: 'FRUCI',
    type: 'subBrandSearch',
    searchPlaceholder: 'Search',
    emptyMessage: 'Sub brand tidak ditemukan.',
  },
  {
    name: 'item_name',
    label: 'Item Name',
    placeholder: 'BACKPACK KIDS',
  },
]

const parentDetailFields = [
  {
    name: 'category_id',
    label: 'Category',
    placeholder: 'Pilih category',
    type: 'select',
    optionsKey: 'categories',
    searchPlaceholder: 'Cari category...',
    emptyMessage: 'Category tidak ditemukan.',
  },
  {
    name: 'item_type_id',
    label: 'Item Source',
    placeholder: 'Pilih Source',
    type: 'select',
    optionsKey: 'itemTypes',
    searchPlaceholder: 'Cari item type...',
    emptyMessage: 'Item type tidak ditemukan.',
  },
  {
    name: 'port_id',
    label: 'Port',
    placeholder: 'Pilih port',
    type: 'checkbox-list',
    optionsKey: 'ports',
    searchPlaceholder: 'Cari port...',
    emptyMessage: 'Port tidak ditemukan.',
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
}

const emptyMasterOptions = {
  brands: [],
  categories: [],
  itemTypes: [],
  ports: [],
}

function getNestedId(item, key) {
  return item?.[`${key}_id`] ?? item?.[key]?.id ?? ''
}

function getNestedLabel(item, key, labelKeys = ['name']) {
  const nestedItem = item?.[key]

  if (!nestedItem || typeof nestedItem !== 'object') {
    return ''
  }

  return getFirstFilledValue(nestedItem, labelKeys)
}

function getPortIds(parent) {
  if (Array.isArray(parent?.port_id)) {
    return parent.port_id.map((portId) => String(portId ?? '')).filter(Boolean)
  }

  if (Array.isArray(parent?.ports)) {
    return parent.ports
      .map((port) => port?.id ?? port?.port_id ?? port?.value ?? '')
      .map((portId) => String(portId ?? ''))
      .filter(Boolean)
  }

  const portId = parent?.port_id ?? parent?.port?.id ?? ''

  return portId ? [String(portId)] : []
}

function getParentId(parent) {
  return parent?.id ?? null
}

function createFormValuesFromParent(parent) {
  if (!parent) {
    return initialFormValues
  }

  return {
    subbrand_id: String(parent.subbrand_id ?? parent.subbrand?.id ?? ''),
    brand_id: String(getNestedId(parent, 'brand')),
    sub_brand: parent.sub_brand ?? '',
    item_name: parent.item_name ?? '',
    category_id: String(getNestedId(parent, 'category')),
    item_type_id: String(getNestedId(parent, 'item_type')),
    port_id: getPortIds(parent),
    parent_name: parent.parent_name ?? '',
    status: parent.status ?? 'active',
  }
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

function SearchableMasterSelect({
  id,
  label,
  value = '',
  options = [],
  placeholder = 'Pilih data',
  searchPlaceholder = 'Cari data...',
  emptyMessage = 'Data tidak ditemukan.',
  loading = false,
  disabled = false,
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

    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      String(option.searchText || option.label).toLowerCase().includes(normalizedQuery),
    )
  }, [options, searchQuery])

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
    const menuChromeHeight = 72
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
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
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
    if (isOpen && menuStyle) {
      searchInputRef.current?.focus()
    }
  }, [isOpen, menuStyle])

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

  const displayValue = loading ? 'Memuat data...' : selectedOption?.label || placeholder
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
            <div className="parent-master-select__search">
              <SearchMd size={16} className="parent-master-select__search-icon" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                className="parent-master-select__search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={`Cari ${label}`}
              />
            </div>

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
                  {loading ? 'Memuat data...' : emptyMessage}
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
  placeholder = 'Cari sub brand',
  searchPlaceholder = 'Cari sub brand...',
  emptyMessage = 'Sub brand tidak ditemukan.',
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
                    ? 'Memuat data...'
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

function DialogEditParent({
  isOpen = false,
  eyebrow = 'Edit Item Parent',
  title = 'Edit Parent',
  parent = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromParent(parent))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromParent(parent))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [parent])

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
        const [brands, categories, itemTypes, ports] = await Promise.all([
          api.brands.list({ is_active: 1 }, { signal: controller.signal }),
          api.categories.list({ is_active: 1 }, { signal: controller.signal }),
          api.itemTypes.list({ is_active: 1 }, { signal: controller.signal }),
          api.ports.list({ is_active: 1 }, { signal: controller.signal }),
        ])

        if (!isMounted) {
          return
        }

        setMasterOptions({
          brands: normalizeMasterOptions(brands, 'brands'),
          categories: normalizeMasterOptions(categories, 'categories'),
          itemTypes: normalizeMasterOptions(itemTypes, 'itemTypes'),
          ports: normalizeMasterOptions(ports, 'ports'),
        })
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
        setErrorMessage(error?.message || 'Gagal memuat data master item parent.')
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

  const selectedBrandLabel = useMemo(
    () =>
      getOptionLabel(masterOptions.brands, formValues.brand_id) ||
      getNestedLabel(parent, 'brand', masterSelectDefaults.brands.labelKeys),
    [formValues.brand_id, masterOptions.brands, parent],
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
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handlePortToggle = (portId) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const normalizedPortId = String(portId ?? '')
      const selectedPortIds = Array.isArray(currentValues.port_id)
        ? currentValues.port_id.map((selectedPortId) => String(selectedPortId ?? '')).filter(Boolean)
        : normalizeFieldValue(currentValues.port_id)
          ? [normalizeFieldValue(currentValues.port_id)]
          : []
      const isSelected = selectedPortIds.includes(normalizedPortId)

      return {
        ...currentValues,
        port_id: isSelected
          ? selectedPortIds.filter((selectedPortId) => selectedPortId !== normalizedPortId)
          : [...selectedPortIds, normalizedPortId],
      }
    })
  }

  const handleSubBrandChange = (value, option) => {
    setErrorMessage('')
    setFormValues((currentValues) => ({
      ...currentValues,
      subbrand_id: option?.subbrand_id || '',
      sub_brand: value,
    }))
  }

  const buildPayload = () => {
    const { port_id: portIds, ...parentValues } = formValues

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
      ports: buildParentPorts(portIds),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()
    const hasEmptyRequiredValue = requiredFieldNames.some((fieldName) => {
      const value = payload[fieldName]

      return Array.isArray(value) ? value.length === 0 : !value
    })

    if (hasEmptyRequiredValue || !payload.parent_name) {
      setErrorMessage('Lengkapi semua field item parent terlebih dahulu.')
      return
    }

    const parentId = getParentId(parent)

    if (!parentId) {
      setErrorMessage('ID item parent tidak ditemukan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedParent = await api.itemParents.update(parentId, payload)

      onEdited?.(getResourceData(editedParent), payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah item parent.')
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
        {field.label}
      </label>
      {field.type === 'checkbox-list' ? (
        <CheckboxSelect
          id={`parent-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters}
          onToggle={handlePortToggle}
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
          disabled={isSubmitting || isLoadingMasters}
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
          disabled={isSubmitting}
          onChange={handleSubBrandChange}
        />
      ) : (
        <input
          id={`parent-${field.name}`}
          name={field.name}
          className="register-user-popup__input"
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
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-parent-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-parent-title">
              {dialogTitle}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close parent-create-popup__close"
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
                  <div className="register-user-popup__grid parent-create-popup__grid parent-create-popup__grid--formula">
                    {parentFormulaFields.map(renderField)}
                  </div>
                </div>

                <div className="parent-create-popup__section">
                  <div className="register-user-popup__grid parent-create-popup__grid parent-create-popup__grid--detail">
                    {parentDetailFields.map(renderField)}
                    <div className="register-user-popup__field">
                      <label className="register-user-popup__label" htmlFor="parent-status">
                        Status
                      </label>
                      <select
                        id="parent-status"
                        name="status"
                        className="register-user-popup__select"
                        value={formValues.status}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </div>
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
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditParent
