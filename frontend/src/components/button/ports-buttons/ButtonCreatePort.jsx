import { useState } from 'react'

import DialogCreatePort from '../../dialog/dialog-ports/DialogCreatePort.jsx'
import { Boxes01 } from '../../template/TemplateIcons.jsx'

function ButtonCreatePort({
  className = '',
  children = 'Create Port',
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

  const handleCreated = (createdPort) => {
    dialogProps.onCreated?.(createdPort)
    onCreated?.(createdPort)
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

      <DialogCreatePort
        {...dialogProps}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onCreated={handleCreated}
      />
    </>
  )
}

export default ButtonCreatePort
