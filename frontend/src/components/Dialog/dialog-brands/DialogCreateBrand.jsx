import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import CheckboxSelect from '../../dropdown/filter/CheckBox.jsx'
import { XClose } from '../../template/TemplateIcons.jsx'
import { useAlertAction } from '../../alert/alert-action/AlertActionContext.jsx'
import ValidationAlertBanner from '../ValidationAlertBanner.jsx'

const initialFormValues = {
  name: '',
  business_unit_id: '',
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

function normalizeDepartmentOptions(responseData) {
  return normalizeListResponse(responseData)
    .map((department) => {
      const option = makeOption(department.department_id ?? department.id ?? department.value, [
        department.department_name ?? department.name,
        department.department_code ?? department.code,
      ])

      option.code = department.department_code ?? department.code ?? ''

      return option
    })
    .filter((option) => option.value && option.label)
    .sort((firstOption, secondOption) => firstOption.label.localeCompare(secondOption.label))
}

function getSelectedDepartmentIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = String(value ?? '').trim()

  return normalizedValue ? [normalizedValue] : []
}

function generateBrandCode(name) {
  return String(name ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
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

      const numericBusinessUnitId = Number(formValues.business_unit_id)

      return {
        business_unit_id: Number.isNaN(numericBusinessUnitId)
          ? formValues.business_unit_id
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

function DialogCreateBrand({
  isOpen = false,
  eyebrow = 'Create Brand',
  title = 'Create Brand',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingMasters, setIsLoadingMasters] = useState(false)
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [masterOptions, setMasterOptions] = useState(emptyMasterOptions)
  const [errorMessage, setErrorMessage] = useState('')
  const { notifySuccess } = useAlertAction()

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
      setErrorMessage('')

      try {
        const businessUnits = await api.businessUnits.list(
          { active: 1 },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setMasterOptions({
          businessUnits: normalizeBusinessUnitOptions(businessUnits),
          departments: [],
        })
      } catch (error) {
        if (!isMounted || error?.name === 'AbortError') {
          return
        }

        setMasterOptions(emptyMasterOptions)
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
    if (!isOpen || !formValues.business_unit_id) {
      return undefined
    }

    let isMounted = true
    const controller = new AbortController()

    const loadDepartmentOptions = async () => {
      setIsLoadingDepartments(true)
      setErrorMessage('')

      try {
        const departments = await api.businessUnits.departments(
          formValues.business_unit_id,
          { active: 1 },
          { signal: controller.signal },
        )

        if (!isMounted) {
          return
        }

        setMasterOptions((currentOptions) => ({
          ...currentOptions,
          departments: normalizeDepartmentOptions(departments),
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

  const buildPayload = () => {
    const payload = {
      code: generateBrandCode(formValues.name),
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
      setErrorMessage('Brand name has not generated a valid code yet.')
      return
    }

    if (!formValues.business_unit_id || !Array.isArray(payload.channels) || payload.channels.length === 0) {
      setErrorMessage('Please select a business unit and at least one channel first.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdBrand = await api.brands.create(payload)

      onCreated?.(createdBrand)
      notifySuccess('Brand created successfully.')
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to create brand.')
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
    !formValues.business_unit_id

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
        aria-labelledby="dialog-create-brand-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-brand-title">
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
                        readOnly={field.readOnly}
                        aria-readonly={field.readOnly ? 'true' : undefined}
                      />
                    </div>
                  ))}

                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="brand-business-unit">
                      Business Unit
                    </label>
                    <select
                      id="brand-business-unit"
                      name="business_unit_id"
                      className="register-user-popup__select"
                      value={formValues.business_unit_id}
                      onChange={handleInputChange}
                      disabled={isSubmitting || isLoadingMasters}
                    >
                      <option value="">
                        {isLoadingMasters ? 'Loading data...' : 'Select business unit'}
                      </option>
                      {masterOptions.businessUnits.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
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
                        formValues.business_unit_id
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
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreateBrand
