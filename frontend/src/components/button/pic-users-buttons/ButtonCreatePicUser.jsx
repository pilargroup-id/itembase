import { useState } from 'react'

import DialogCreatePicUser from '../../dialog/dialog-pic-users/DialogCreatePicUser.jsx'
import { Boxes01 } from '../../template/TemplateIcons.jsx'

function ButtonCreatePicUser({
  className = '',
  children = 'Create Pic User',
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

  const handleCreated = (createdPicUser) => {
    dialogProps.onCreated?.(createdPicUser)
    onCreated?.(createdPicUser)
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

      <DialogCreatePicUser
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreatePicUser
