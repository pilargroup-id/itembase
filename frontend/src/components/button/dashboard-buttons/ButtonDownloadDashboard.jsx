import { useState } from 'react'

import DialogDownloadSelect from '../../Dialog/dialog-dashboard/DialogDownload.jsx'

const buttonClassNames = {
  action: 'users-table-card__action',
  detail: 'users-table__detail-button',
  accordion: 'users-table__accordion-button',
  icon: 'users-table__icon-button',
  pagination: 'users-table-pagination__button',
}

function ButtonDownloadDashboard({
  children,
  className = '',
  variant = 'accordion',
  tone = 'default',
  active = false,
  type = 'button',
  dialogEyebrow,
  dialogTitle,
  onClick,
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const buttonClassName = [
    buttonClassNames[variant] ?? buttonClassNames.accordion,
    variant === 'accordion' && tone === 'danger' ? 'users-table__accordion-button--danger' : '',
    variant === 'icon' && tone === 'danger' ? 'users-table__icon-button--danger' : '',
    variant === 'pagination' && active ? 'users-table-pagination__button--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = (event) => {
    onClick?.(event)

    if (event.defaultPrevented) {
      return
    }

    setIsDialogOpen(true)
  }

  return (
    <>
      <button type={type} className={buttonClassName} onClick={handleClick} {...buttonProps}>
        {children}
      </button>

      <DialogDownloadSelect
        isOpen={isDialogOpen}
        eyebrow={dialogEyebrow}
        title={dialogTitle}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  )
}

export default ButtonDownloadDashboard
