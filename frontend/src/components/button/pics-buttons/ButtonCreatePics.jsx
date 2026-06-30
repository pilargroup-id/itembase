import { useState } from 'react'

import DialogCreatePics from '../../dialog/dialog-pics/DialogCreatePics.jsx'
import { Boxes01 } from '../../template/TemplateIcons.jsx'

function ButtonCreatePics({
  className = '',
  children = 'Create Pics',
  dialogProps = {},
  iconSize = 18,
  onClick,
  onCreated,
  type = 'button',
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const buttonClassName = ['users-table-card__action', className].filter(Boolean).join(' ')

  const handleOpenDialog = (event) => {
    onClick?.(event)

    if (!event.defaultPrevented) {
      setIsDialogOpen(true)
    }
  }

  const handleCloseDialog = () => {
    dialogProps.onClose?.()
    setIsDialogOpen(false)
  }

  const handleCreated = (createdPics) => {
    dialogProps.onCreated?.(createdPics)
    onCreated?.(createdPics)
  }

  return (
    <>
      <button
        {...buttonProps}
        type={type}
        className={buttonClassName}
        onClick={handleOpenDialog}
        aria-expanded={isDialogOpen}
      >
        <Boxes01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
      </button>

      <DialogCreatePics
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreatePics
