import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'
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
      const option = makeOption(parent.id ?? parent.value ?? parent.parent_id ?? parent.item_parent_id, [
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
          itemName: String(parent?.item_name ?? item?.item_name ?? ''),
        },
      ]
    : []
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

function getNestedId(item, key) {
  return item?.[`${key}_id`] ?? item?.[key]?.id ?? ''
}

function createFormValuesFromItem(item) {
  if (!item) {
    return initialFormValues
  }

  return {
    item_kind: item.item_kind ?? 'regular',
    parent_id: String(getParentId(item)),
    item_name: item.item_name ?? '',
    selling_name: item.selling_name ?? '',
    uom_id: String(getNestedId(item, 'uom')),
    variant: item.variant ?? '',
    qty_per_pack: item.qty_per_pack ?? '',
    height: item.height ?? '',
    width: item.width ?? '',
    depth: item.depth ?? '',
    gross_weight_pack: item.gross_weight_pack ?? '',
    production_time_days: item.production_time_days ?? '',
    is_active: String(item.is_active ?? 1),
  }
}

function buildPayload(formValues) {
  return Object.fromEntries(
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
}

function hasRequiredValues(payload) {
  if (!payload.item_kind || !payload.item_name) {
    return false
  }

  return true
}

function DialogEditItem({
  isOpen = false,
  eyebrow = 'Edit Item',
  title = 'Edit Item',
  item = null,
  parent = null,
  onClose,
  onEdited,
}) {
  const incomingItem = item ?? parent
  const [detailItem, setDetailItem] = useState(incomingItem)
  const selectedItem = detailItem ?? incomingItem
  const [formValues, setFormValues] = useState(() => createFormValuesFromItem(selectedItem))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')
  const parentOptions = useMemo(
    () => mergeOptions(masterOptions.parents, normalizeParentOptionFromItem(selectedItem)),
    [masterOptions.parents, selectedItem],
  )

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromItem(selectedItem))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [selectedItem])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    if (isOpen) {
      setDetailItem(incomingItem)
      setFormValues(createFormValuesFromItem(incomingItem))
    }
  }, [incomingItem, isOpen])

  useEffect(() => {
    if (!isOpen || !incomingItem?.id) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadItemDetail = async () => {
      try {
        const response = await api.items.detail(incomingItem.id, undefined, {
          signal: controller.signal,
        })
        const itemDetail = getResourceData(response)

        if (!isMounted || !itemDetail) {
          return
        }

        setDetailItem(itemDetail)
        setFormValues(createFormValuesFromItem(itemDetail))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }
      }
    }

    loadItemDetail()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [incomingItem?.id, isOpen])

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
        const [parents, uoms] = await Promise.all([
          api.itemParents.options(
            { page: 1, limit: 20, status: 'active' },
            { signal: controller.signal },
          ),
          api.uoms.list({ is_active: 1 }, { signal: controller.signal }),
        ])

        if (!isMounted) {
          return
        }

        setMasterOptions({
          parents: normalizeParentOptions(parents),
          uoms: normalizeMasterOptions(uoms),
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

  const handleFieldChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const selectedParent =
        name === 'parent_id'
          ? parentOptions.find((option) => option.value === String(value ?? ''))
          : null
      const nextItemName =
        name === 'parent_id'
          ? selectedParent?.itemName || currentValues.item_name
          : name === 'item_name'
            ? value
            : currentValues.item_name

      return {
        ...currentValues,
        [name]: value,
        ...(
          name === 'parent_id' && selectedParent?.itemName
            ? { item_name: selectedParent.itemName }
            : {}
        ),
        ...(
          name === 'parent_id' || name === 'item_name'
            ? { selling_name: toTitleCase(nextItemName) }
            : {}
        ),
      }
    })
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    handleFieldChange(name, value)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedItem?.id) {
      setErrorMessage('ID item tidak ditemukan.')
      return
    }

    const payload = buildPayload(formValues)

    if (!hasRequiredValues(payload)) {
      setErrorMessage('Lengkapi item name terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedItem = await api.items.update(selectedItem.id, payload, undefined)

      onEdited?.(editedItem, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah item.')
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
      {field.type === 'select' ? (
        <SearchableItemSelect
          id={`item-${field.name}`}
          label={field.label}
          value={formValues[field.name]}
          options={field.name === 'parent_id' ? parentOptions : masterOptions[field.optionsKey]}
          placeholder={field.placeholder}
          searchPlaceholder={field.searchPlaceholder}
          emptyMessage={field.emptyMessage}
          loading={isLoadingMasters}
          disabled={isSubmitting || isLoadingMasters}
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
      // onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup item-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-item-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-item-title">
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

                <div className="parent-create-popup__section item-create-popup__dimension-backdrop">
                  <div className="parent-create-popup__section-header">
                    <h3 className="parent-create-popup__section-title">Dimency Item</h3>
                    <p className="parent-create-popup__section-description">
                      Lengkapi detail dimensi item mulai dari UOM sampai lead time.
                    </p>
                  </div>

                  <div className="register-user-popup__grid item-create-popup__dimension-grid" style={{ rowGap: '12px' }}>
                    {itemFields
                      .filter((field) =>
                        [
                          'uom_id',
                          'qty_per_pack',
                          'height',
                          'width',
                          'depth',
                          'gross_weight_pack',
                          'production_time_days',
                        ].includes(field.name),
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
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogEditItem
