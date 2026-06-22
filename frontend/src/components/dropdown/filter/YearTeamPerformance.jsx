import { useEffect, useMemo, useRef, useState } from 'react'

import { ChevronDown } from '../../template/TemplateIcons.jsx'

function normalizeOption(option) {
  if (typeof option === 'object' && option !== null) {
    return {
      value: String(option.value ?? ''),
      label: option.label ?? String(option.value ?? ''),
    }
  }

  return {
    value: String(option ?? ''),
    label: String(option ?? ''),
  }
}

function YearDropdownTP({
  options = [],
  value = '',
  label = 'Tahun',
  className = '',
  onChange,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef(null)
  const normalizedOptions = useMemo(() => {
    const nextOptions = options.map(normalizeOption).filter((option) => option.value)

    if (nextOptions.length > 0) {
      return nextOptions
    }

    return []
  }, [options])
  const selectedValue = String(value ?? '')
  const selectedOption = normalizedOptions.find((option) => option.value === selectedValue) ?? {
    value: selectedValue,
    label: selectedValue || 'Pilih tahun',
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = (nextValue) => {
    onChange?.(String(nextValue))
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={['year-dropdown-tp', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={`year-dropdown-tp__trigger${isOpen ? ' year-dropdown-tp__trigger--open' : ''}`}
        onClick={() => setIsOpen((currentState) => !currentState)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="year-dropdown-tp__copy">
          <span className="year-dropdown-tp__label">{label}</span>
          <span className="year-dropdown-tp__value">{selectedOption.label}</span>
        </span>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`year-dropdown-tp__chevron${isOpen ? ' year-dropdown-tp__chevron--open' : ''}`}
        />
      </button>

      {isOpen ? (
        <div className="year-dropdown-tp__menu" role="listbox" aria-label={label}>
          {normalizedOptions.map((option) => {
            const isSelected = option.value === selectedValue

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={[
                  'year-dropdown-tp__option',
                  isSelected ? 'year-dropdown-tp__option--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleSelect(option.value)}
              >
                <span className="year-dropdown-tp__option-label">{option.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default YearDropdownTP
