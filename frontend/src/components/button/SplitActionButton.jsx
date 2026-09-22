import { useEffect, useRef, useState } from 'react'

import { ChevronDown } from '../template/TemplateIcons.jsx'

function SplitActionButton({ mainAction, menuLabel = 'More actions', children }) {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      if (containerRef.current?.contains(event.target)) return

      setIsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div
      ref={containerRef}
      className={[
        'parent-table-split-button',
        isOpen ? 'parent-table-split-button--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {mainAction}

      <button
        type="button"
        className="parent-table-split-button__toggle"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={menuLabel}
        onClick={() => setIsOpen((open) => !open)}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      <div
        className="parent-table-split-button__menu"
        role="menu"
        onClick={() => setIsOpen(false)}
      >
        {children}
      </div>
    </div>
  )
}

export default SplitActionButton
