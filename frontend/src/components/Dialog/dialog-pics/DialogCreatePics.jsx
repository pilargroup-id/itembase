import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import api from '../../../services/api.js'
import { XClose } from '../../template/TemplateIcons.jsx'

const initialFormValues = {
  pic1: '',
  pic2: '',
  is_active: '1',
}

function DialogCreatePics({
  isOpen = false,
  eyebrow = 'Create Pics',
  title = 'Create Pics',
  onClose,
  onCreated,
}) {
  const [formValues, setFormValues] = useState(initialFormValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [picUserOptions, setPicUserOptions] = useState([])
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)

  const resetDialogState = useCallback(() => {
    setFormValues(initialFormValues)
    setIsSubmitting(false)
    setErrorMessage('')
  }, [])

  const handleClose = useCallback(() => {
    resetDialogState()
    onClose?.()
  }, [onClose, resetDialogState])

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
        console.error('[DialogCreatePics] Failed to fetch pic-user options:', err)
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
    const pics = picParts.join('-')
    return {
      code: pics,
      name: pics,
      is_active: Number(formValues.is_active),
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formValues.pic1 || !formValues.pic2) {
      setErrorMessage('Pilih 2 PIC User terlebih dahulu.')
      return
    }

    const payload = buildPayload()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const createdPics = await api.pics.create(payload)
      onCreated?.(createdPics)
      handleClose()
    } catch (error) {
      setErrorMessage(error?.message || 'Gagal membuat Pics.')
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
        aria-labelledby="dialog-create-pics-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">{eyebrow}</p>
            <h2 className="dashboard-popup__title" id="dialog-create-pics-title">
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
                    <label className="register-user-popup__label" htmlFor="pics-pic1">
                      PIC 1
                    </label>
                    <select
                      id="pics-pic1"
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
                    <label className="register-user-popup__label" htmlFor="pics-pic2">
                      PIC 2
                    </label>
                    <select
                      id="pics-pic2"
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
                        <option key={opt.id} value={opt.username ?? opt.name}>
                          {opt.name}{opt.username ? ` (${opt.username})` : ''}
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
                    <label className="register-user-popup__label" htmlFor="pics-is-active">
                      Status
                    </label>
                    <select
                      id="pics-is-active"
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
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )

  return createPortal(dialogNode, document.body)
}

export default DialogCreatePics
