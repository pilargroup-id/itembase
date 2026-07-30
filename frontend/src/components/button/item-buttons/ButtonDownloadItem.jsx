import { useState } from 'react'

import api from '../../../services/api.js'
import { Download01 } from '../../template/TemplateIcons.jsx'

function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function ButtonDownloadItem({
  className = '',
  children = 'Download',
  iconSize = 18,
  onClick,
  type = 'button',
  ...buttonProps
}) {
  const [isDownloading, setIsDownloading] = useState(false)
  const buttonClassName = ['users-table-card__action parent-table-tool-button', className]
    .filter(Boolean)
    .join(' ')

  const handleClick = async (event) => {
    onClick?.(event)

    if (event.defaultPrevented || isDownloading) {
      return
    }

    setIsDownloading(true)

    try {
      const blob = await api.itemDownloads.xlsx({ download: 'items' })

      saveBlob(blob, 'items.xlsx')
    } catch (error) {
      console.error(error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button
      {...buttonProps}
      type={type}
      className={buttonClassName}
      onClick={handleClick}
      disabled={isDownloading || buttonProps.disabled}
      aria-busy={isDownloading}
    >
      <Download01 size={iconSize} aria-hidden="true" />
      <span>{isDownloading ? 'Downloading...' : children}</span>
    </button>
  )
}

export default ButtonDownloadItem
