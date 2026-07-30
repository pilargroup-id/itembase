import { useRef } from 'react'

import { Upload01 } from '../../template/TemplateIcons.jsx'

function ButtonImportBundle({
  className = '',
  children = 'Import',
  iconSize = 18,
  onClick,
  onFileSelect,
  type = 'button',
  ...buttonProps
}) {
  const inputRef = useRef(null)
  const buttonClassName = ['users-table-card__action parent-table-tool-button', className]
    .filter(Boolean)
    .join(' ')

  const handleClick = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = (event) => {
    const [file] = Array.from(event.target.files ?? [])

    if (file) {
      onFileSelect?.(file)
    }

    event.target.value = ''
  }

  return (
    <>
      <button {...buttonProps} type={type} className={buttonClassName} onClick={handleClick}>
        <Upload01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="parent-table-import-input"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  )
}

export default ButtonImportBundle
