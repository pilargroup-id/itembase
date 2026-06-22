import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { ChevronDown, SearchMd, XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  brand_id: '',
  sub_brand: '',
  item_name: '',
  category_id: '',
  item_type_id: '',
  port_id: '',
  parent_name: '',
  status: 'active',
}

const parentFields = [
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
  },
  {
    name: 'item_name',
    label: 'Item Name',
    placeholder: 'BACKPACK KIDS',
  },
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
    label: 'Item Type',
    placeholder: 'Pilih item type',
    type: 'select',
    optionsKey: 'itemTypes',
    searchPlaceholder: 'Cari item type...',
    emptyMessage: 'Item type tidak ditemukan.',
  },
  {
    name: 'port_id',
    label: 'Port',
    placeholder: 'Pilih port',
    type: 'select',
    optionsKey: 'ports',
    searchPlaceholder: 'Cari port...',
    emptyMessage: 'Port tidak ditemukan.',
  },
  {
    name: 'parent_name',
    label: 'Parent Name',
    placeholder: 'GOTO FRUCI BACKPACK KIDS',
  },
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

function getParentId(parent) {
  return parent?.id ?? null
}

function createFormValuesFromParent(parent) {
  if (!parent) {
    return initialFormValues
  }

  return {
    brand_id: String(getNestedId(parent, 'brand')),
    sub_brand: parent.sub_brand ?? '',
    item_name: parent.item_name ?? '',
    category_id: String(getNestedId(parent, 'category')),
    item_type_id: String(getNestedId(parent, 'item_type')),
    port_id: String(getNestedId(parent, 'port')),
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
  const rootRef = useRef(null)
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

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const closeDropdown = () => {
      setIsOpen(false)
      setSearchQuery('')
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
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
    if (isOpen) {
      searchInputRef.current?.focus()
    }
  }, [isOpen])

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

  return (
    <div ref={rootRef} className="parent-master-select">
      <button
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

      {isOpen ? (
        <div className="parent-master-select__menu" role="listbox" aria-label={label}>
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
        </div>
      ) : null}
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

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleClose, isOpen, isSubmitting, parent])

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

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const buildPayload = () =>
    Object.fromEntries(
      Object.entries(formValues).map(([key, value]) => [key, String(value).trim()]),
    )

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()
    const hasEmptyValue = Object.values(payload).some((value) => !value)

    if (hasEmptyValue) {
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

      onEdited?.(editedParent, payload)
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

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
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
                  {parentFields.map((field) => (
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
                      {field.type === 'select' ? (
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
                  ))}

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

export default DialogEditParent
