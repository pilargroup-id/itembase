import { useState } from 'react'

import DialogCreateParent from '../../Dialog/dialog-parent/DialogCreateParent.jsx'
import { Boxes01 } from '../../template/TemplateIcons.jsx'

function ButtonCreateParent({
  className = '',
  children = 'Create parent',
  dialogProps = {},
  iconSize = 18,
  onClick,
  onCreated,
  onDeleted,
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

  const handleCreated = (createdParent) => {
    dialogProps.onCreated?.(createdParent)
    onCreated?.(createdParent)
  }

  const handleDeleted = (deletedParentId) => {
    dialogProps.onDeleted?.(deletedParentId)
    onDeleted?.(deletedParentId)
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

      <DialogCreateParent
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
        onDeleted={handleDeleted}
      />
    </>
  )
}

export default ButtonCreateParent
