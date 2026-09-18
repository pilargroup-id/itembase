import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import CheckboxSelect from '../../dropdown/filter/CheckBox.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

const initialFormValues = {
  name: '',
  business_unit_id: [],
  department_id: [],
  is_active: '1',
}

const brandFields = [
  {
    name: 'name',
    label: 'Name',
    placeholder: 'Input Name Brand',
  },
]

const emptyMasterOptions = {
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

function normalizeBusinessUnitOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((unit) => makeOption(unit.id ?? unit.value, [unit.name, unit.code]))
    .filter((option) => option.value && option.label)
    .sort((firstOption, secondOption) => firstOption.label.localeCompare(secondOption.label))
}

function normalizeDepartmentOptions(responseData, businessUnitId) {
  return normalizeListResponse(responseData)
    .map((department) => {
      const option = makeOption(department.department_id ?? department.id ?? department.value, [
        department.department_name ?? department.name,
        department.department_code ?? department.code,
      ])

      option.code = department.department_code ?? department.code ?? ''
      option.businessUnitId = String(businessUnitId ?? '')

      return option
    })
    .filter((option) => option.value && option.label)
    .sort((firstOption, secondOption) => firstOption.label.localeCompare(secondOption.label))
}

function mergeDepartmentOptionLists(optionLists) {
  const optionMap = new Map()

  optionLists.flat().forEach((option) => {
    if (option?.value && !optionMap.has(option.value)) {
      optionMap.set(option.value, option)
    }
  })

  return Array.from(optionMap.values())
}

function getSelectedValues(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = String(value ?? '').trim()

  return normalizedValue ? [normalizedValue] : []
}

function createChannelPayload(formValues, departmentOptions) {
  const selectedDepartmentIds = getSelectedValues(formValues.department_id)

  if (selectedDepartmentIds.length === 0) {
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
      const numericBusinessUnitId = Number(departmentOption.businessUnitId)

      return {
        business_unit_id: Number.isNaN(numericBusinessUnitId)
          ? departmentOption.businessUnitId
          : numericBusinessUnitId,
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

function getBrandId(brand) {
  return brand?.id ?? brand?.brand_id ?? null
}

function getBrandCode(brand) {
  return brand?.code ?? brand?.brand_code ?? ''
}

function getBrandStatusValue(brand) {
  if (brand?.is_active !== undefined && brand?.is_active !== null) {
    return Number(brand.is_active) === 1 ? '1' : '0'
  }

  const normalizedStatus = String(brand?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return '1'
  }

  if (normalizedStatus === 'inactive') {
    return '0'
  }

  return '1'
}

function getBrandChannels(brand) {
  return Array.isArray(brand?.channels) ? brand.channels : []
}

function getBrandBusinessUnitIds(brand) {
  const businessUnitIds = getBrandChannels(brand)
    .map((channel) => String(channel.business_unit_id ?? channel.business_unit?.id ?? ''))
    .filter(Boolean)

  return Array.from(new Set(businessUnitIds))
}

function getBrandDepartmentIds(brand) {
  const departmentIds = getBrandChannels(brand)
    .map((channel) => String(channel.department_id ?? channel.department?.id ?? ''))
    .filter(Boolean)

  return Array.from(new Set(departmentIds))
}

function createFormValuesFromBrand(brand) {
  if (!brand) {
    return initialFormValues
  }

  return {
    name: brand.name ?? brand.brand_name ?? '',
    business_unit_id: getBrandBusinessUnitIds(brand),
    department_id: getBrandDepartmentIds(brand),
    is_active: getBrandStatusValue(brand),
  }
}

function DialogEditBrand({
  isOpen = false,
  eyebrow = 'Edit Brand',
  title = 'Edit Brand',
  brand = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromBrand(brand))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromBrand(brand))
    setIsSubmitting(false)
    setMasterOptions((currentOptions) => ({
      ...currentOptions,
      departments: [],
    }))
    setErrorMessage('')
  }, [brand])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromBrand(brand))
  }, [brand])

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
      setErrorMessage('')

      try {
        const businessUnits = await api.businessUnits.list(
          { active: 1 },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          businessUnits: normalizeBusinessUnitOptions(businessUnits),
        }))
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          businessUnits: [],
        }))
        setErrorMessage(error?.message || 'Failed to load business unit data.')
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
    const selectedBusinessUnitIds = getSelectedValues(formValues.business_unit_id)

    if (!isOpen) {
      return undefined
    }

    if (selectedBusinessUnitIds.length === 0) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadDepartmentOptions = async () => {
      setIsLoadingDepartments(true)
      setErrorMessage('')

      try {
        const departmentOptionLists = await Promise.all(
          selectedBusinessUnitIds.map(async (businessUnitId) => {
            const departments = await api.businessUnits.departments(
              businessUnitId,
              { active: 1 },
              { signal: controller.signal },
            )

            return normalizeDepartmentOptions(departments, businessUnitId)
          }),
        )

        if (!isMounted) {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          departments: mergeDepartmentOptionLists(departmentOptionLists),
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
  }, [formValues.business_unit_id, isOpen])

  const handleFieldChange = (name, value) => {
    setErrorMessage('')
    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target

    handleFieldChange(name, value)
  }

  const handleBusinessUnitToggle = (businessUnitId) => {
    setErrorMessage('')

    const selectedBusinessUnitIds = getSelectedValues(formValues.business_unit_id)
    const normalizedBusinessUnitId = String(businessUnitId)
    const isSelected = selectedBusinessUnitIds.includes(normalizedBusinessUnitId)
    const nextBusinessUnitIds = isSelected
      ? selectedBusinessUnitIds.filter((selectedId) => selectedId !== normalizedBusinessUnitId)
      : [...selectedBusinessUnitIds, normalizedBusinessUnitId]

    setFormValues((currentValues) => ({
      ...currentValues,
      business_unit_id: nextBusinessUnitIds,
      department_id: [],
    }))

    if (nextBusinessUnitIds.length === 0) {
      setMasterOptions((currentOptions) => ({
        ...currentOptions,
        departments: [],
      }))
    }
  }

  const handleDepartmentToggle = (departmentId) => {
    setErrorMessage('')
    setFormValues((currentValues) => {
      const selectedDepartmentIds = getSelectedValues(currentValues.department_id)
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

  const buildPayload = () => {
    const payload = {
      code: getBrandCode(brand),
      name: formValues.name.trim(),
      is_active: Number(formValues.is_active),
    }
    const channels = createChannelPayload(formValues, masterOptions.departments)

    if (channels.length > 0) {
      payload.channels = channels
    }

    return payload
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const payload = buildPayload()

    if (!payload.name) {
      setErrorMessage('Please enter the brand name first.')
      return
    }

    if (!payload.code) {
      setErrorMessage('Brand code not found.')
      return
    }

    if (
      getSelectedValues(formValues.business_unit_id).length === 0 ||
      !Array.isArray(payload.channels) ||
      payload.channels.length === 0
    ) {
      setErrorMessage('Please select a business unit and at least one channel first.')
      return
    }

    const brandId = getBrandId(brand)

    if (!brandId) {
      setErrorMessage('Brand ID not found.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedBrand = await api.brands.update(brandId, payload)

      onEdited?.(editedBrand, payload)
      notifySuccess('Brand updated successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to update brand.')
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

  const isChannelDisabled =
    isSubmitting ||
    isLoadingMasters ||
    isLoadingDepartments ||
    getSelectedValues(formValues.business_unit_id).length === 0

  const dialogNode = (
    <div
      className="dashboard-popup-overlay"
      role="presentation"
      onClick={isSubmitting ? undefined : handleClose}
    >
      <form
        className="dashboard-popup register-user-popup mtickets-create-popup parent-create-popup brand-create-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-edit-brand-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-brand-title">
              {title}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Close dialog"
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
                  {brandFields.map((field) => (
                    <div key={field.name} className="register-user-popup__field">
                      <label
                        className="register-user-popup__label"
                        htmlFor={`brand-${field.name}`}
                      >
                        {field.label}
                      </label>
                      <input
                        id={`brand-${field.name}`}
                        name={field.name}
                        className="register-user-popup__input"
                        value={formValues[field.name]}
                        placeholder={field.placeholder}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                      />
                    </div>
                  ))}

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="brand-business-unit">
                      Business Unit
                    </label>
                    <CheckboxSelect
                      id="brand-business-unit"
                      label="Business Unit"
                      value={formValues.business_unit_id}
                      options={masterOptions.businessUnits}
                      placeholder="Select business unit"
                      emptyMessage="Business unit not found."
                      loading={isLoadingMasters}
                      disabled={isSubmitting || isLoadingMasters}
                      onToggle={handleBusinessUnitToggle}
                    />
                  </div>

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="brand-channel">
                      Channel
                    </label>
                    <CheckboxSelect
                      id="brand-channel"
                      label="Channel"
                      value={formValues.department_id}
                      options={masterOptions.departments}
                      placeholder="Select channel"
                      emptyMessage={
                        getSelectedValues(formValues.business_unit_id).length > 0
                          ? 'Channel not found.'
                          : 'Select a business unit first.'
                      }
                      loading={isLoadingDepartments}
                      disabled={isChannelDisabled}
                      onToggle={handleDepartmentToggle}
                    />
                  </div>
                </div>
                <ValidationAlertBanner
                  message={errorMessage}
                  onDismiss={() => setErrorMessage('')}
                />
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
            Cancel
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

export default DialogEditBrand
