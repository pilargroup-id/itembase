import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ChevronDown, SearchMd } from '../../template/TemplateIcons.jsx'

function getSelectedOptionIds(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }

  const normalizedValue = String(value ?? '').trim()

  return normalizedValue ? [normalizedValue] : []
}

function CheckboxSelect({
  id,
  label,
  value = [],
  options = [],
  placeholder = 'Pilih data',
  searchPlaceholder = '',
  emptyMessage = 'Data tidak ditemukan.',
  loading = false,
  disabled = false,
  showOrder = false,
  onToggle,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuStyle, setMenuStyle] = useState(null)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const searchInputRef = useRef(null)
  const isSearchable = Boolean(searchPlaceholder)
  const selectedIds = getSelectedOptionIds(value)
  const selectedOptions = selectedIds
    .map((selectedId) => options.find((option) => option.value === selectedId))
    .filter(Boolean)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!isSearchable || !normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      String(option.searchText || option.label).toLowerCase().includes(normalizedQuery),
    )
  }, [isSearchable, options, searchQuery])

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
      const menuChromeHeight = isSearchable ? 72 : 18
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
        ? Math.max(viewportMargin, bounds.top - gap - optionsHeight - menuChromeHeight)
        : Math.min(
            bounds.bottom + gap,
            window.innerHeight - viewportMargin - optionsHeight - menuChromeHeight,
          )

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
  }, [isOpen, isSearchable])

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
    if (isSearchable && isOpen && menuStyle) {
      searchInputRef.current?.focus()
    }
  }, [isSearchable, isOpen, menuStyle])

  const handleToggleDropdown = () => {
    if (disabled) {
      return
    }

    setIsOpen((currentState) => {
      if (currentState) {
        setMenuStyle(null)
        setSearchQuery('')
      }

      return !currentState
    })
  }

  const displayValue = loading
    ? 'Memuat data...'
    : selectedOptions.length > 0
      ? selectedOptions
          .map((option, index) => (showOrder ? `${index + 1}. ${option.label}` : option.label))
          .join(', ')
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
            {isSearchable ? (
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
            ) : null}

            <div className="parent-master-select__options item-create-popup__channel-options">
              {loading ? (
                <div className="parent-master-select__empty">Memuat data...</div>
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
                      <span>{option.label}</span>
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
};

export default CheckboxSelect;
