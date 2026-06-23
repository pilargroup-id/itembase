import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ChevronDown, SearchMd } from '../../template/TemplateIcons.jsx'

function SearchableItemSelect({
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

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null)
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
      const openUp = spaceBelow < 190 && spaceAbove > spaceBelow
      const optionsHeight = Math.max(96, Math.min(220, (openUp ? spaceAbove : spaceBelow) - 72))
      const menuHeight = optionsHeight + 72
      const top = openUp
        ? Math.max(viewportMargin, bounds.top - gap - menuHeight)
        : Math.min(bounds.bottom + gap, window.innerHeight - viewportMargin - menuHeight)

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
    onChange?.(String(nextValue))
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

export default SearchableItemSelect
