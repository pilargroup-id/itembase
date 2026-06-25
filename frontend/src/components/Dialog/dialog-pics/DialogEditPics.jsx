import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  pic1: '',
  pic2: '',
  is_active: '1',
}

function getPicsId(pics) {
  return pics?.id ?? pics?.pics_id ?? null
}

function getPicsStatusValue(pics) {
  if (pics?.is_active !== undefined && pics?.is_active !== null) {
    return Number(pics.is_active) === 1 ? '1' : '0'
  }

  const normalizedStatus = String(pics?.status ?? '').toLowerCase()

  if (normalizedStatus === 'active') {
    return '1'
  }

  if (normalizedStatus === 'inactive') {
    return '0'
  }

  return '1'
}

/**
 * Split the existing "pics" string (e.g. "UMMA-JEAN") into two parts.
 * Falls back to empty strings if the value is missing.
 */
function splitPics(picsValue) {
  if (!picsValue) return { pic1: '', pic2: '' }
  const dashIdx = picsValue.indexOf('-')
  if (dashIdx === -1) return { pic1: picsValue, pic2: '' }
  return {
    pic1: picsValue.slice(0, dashIdx),
    pic2: picsValue.slice(dashIdx + 1),
  }
}

function createFormValuesFromPics(pics) {
  if (!pics) {
    return initialFormValues
  }

  const picsValue = pics.pics ?? pics.name ?? pics.pics_name ?? ''
  const { pic1, pic2 } = splitPics(picsValue)

  return {
    pic1,
    pic2,
    is_active: getPicsStatusValue(pics),
  }
}

function DialogEditPics({
  isOpen = false,
  eyebrow = 'Edit Pics',
  title = 'Edit Pics',
  pics = null,
  onClose,
  onEdited,
}) {
  const [formValues, setFormValues] = useState(() => createFormValuesFromPics(pics))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [picUserOptions, setPicUserOptions] = useState([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  const resetDialogState = useCallback(() => {
    setFormValues(createFormValuesFromPics(pics))
    setIsSubmitting(false)
    setErrorMessage('')
  }, [pics])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

  useEffect(() => {
    setFormValues(createFormValuesFromPics(pics))
  }, [pics])

  // Fetch pic-user options when dialog opens
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    let cancelled = false

    const fetchOptions = async () => {
      setIsLoadingOptions(true)
      try {
        // Backend response: { success, message, data: { pics: [...], users: [...] } }
        const result = await api.picUsers.options()
        if (!cancelled) {
          const users = result?.data?.users ?? result?.users ?? []
          setPicUserOptions(Array.isArray(users) ? users : [])
        }
      } catch (err) {
        console.error('[DialogEditPics] Failed to fetch pic-user options:', err)
        if (!cancelled) {
          setPicUserOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOptions(false)
        }
      }
    }

    fetchOptions()

    return () => {
      cancelled = true
    }
  }, [isOpen])

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

  const handleSelectChange = (event) => {
    const { name, value } = event.target
    setFormValues((cur) => ({ ...cur, [name]: value }))
  }

  const buildPayload = () => {
    const picParts = [formValues.pic1, formValues.pic2].filter(Boolean)
    const picsValue = picParts.join('-')
    return {
      code: picsValue,
      name: picsValue,
      is_active: Number(formValues.is_active),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formValues.pic1 || !formValues.pic2) {
      setErrorMessage('Pilih 2 PIC User terlebih dahulu.')
      return
    }

    const picsId = getPicsId(pics)

    if (!picsId) {
      setErrorMessage('ID pics tidak ditemukan.')
      return
    }

    const payload = buildPayload()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const editedPics = await api.pics.update(picsId, payload)
      onEdited?.(editedPics, payload)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal mengubah pics.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Preview of combined pics value
  const picsPreview = [formValues.pic1, formValues.pic2].filter(Boolean).join('-')

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
        aria-labelledby="dialog-edit-pics-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-edit-pics-title">
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
                  {/* PIC 1 */}
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="edit-pics-pic1">
                      PIC 1
                    </label>
                    <select
                      id="edit-pics-pic1"
                      name="pic1"
                      className="register-user-popup__select"
                      value={formValues.pic1}
                      onChange={handleSelectChange}
                      disabled={isSubmitting || isLoadingOptions}
                    >
                      <option value="">
                        {isLoadingOptions ? 'Loading...' : '-- Pilih PIC 1 --'}
                      </option>
                      {picUserOptions.map((opt) => (
                        <option key={opt.id} value={opt.username ?? opt.name}>
                          {opt.name}{opt.username ? ` (${opt.username})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PIC 2 */}
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="edit-pics-pic2">
                      PIC 2
                    </label>
                    <select
                      id="edit-pics-pic2"
                      name="pic2"
                      className="register-user-popup__select"
                      value={formValues.pic2}
                      onChange={handleSelectChange}
                      disabled={isSubmitting || isLoadingOptions}
                    >
                      <option value="">
                        {isLoadingOptions ? 'Loading...' : '-- Pilih PIC 2 --'}
                      </option>
                      {picUserOptions.map((opt) => (
                        <option key={opt.value ?? opt.id ?? opt.code} value={opt.value ?? opt.code ?? opt.name}>
                          {opt.label ?? opt.name ?? opt.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview */}
                  {picsPreview ? (
                    <div className="register-user-popup__field" style={{ gridColumn: '1 / -1' }}>
                      <label className="register-user-popup__label">Preview Pics</label>
                      <div
                        className="register-user-popup__input"
                        style={{ background: 'var(--color-surface-2, #f5f5f5)', cursor: 'default', fontWeight: 600 }}
                      >
                        {picsPreview}
                      </div>
                    </div>
                  ) : null}

                  {/* Status */}
                  <div className="register-user-popup__field">
                    <label className="register-user-popup__label" htmlFor="edit-pics-is-active">
                      Status
                    </label>
                    <select
                      id="edit-pics-is-active"
                      name="is_active"
                      className="register-user-popup__select"
                      value={formValues.is_active}
                      onChange={handleSelectChange}
                      disabled={isSubmitting}
                    >
                      <option value="1">active</option>
                      <option value="0">inactive</option>
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

export default DialogEditPics
