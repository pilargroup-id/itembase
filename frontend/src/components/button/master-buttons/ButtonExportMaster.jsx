import { useState } from 'react'

import { Export01 } from '../../template/TemplateIcons.jsx'
import DialogExportMaster from '../../Dialog/dialog-master/DialogExportMaster.jsx'

function ButtonExportMaster({
  type,
  masterLabel = 'Data',
  className = '',
  children = 'Export',
  iconSize = 18,
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const buttonClassName = [
    'users-table-card__action parent-table-tool-button parent-table-tool-button--download',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleOpen = () => {
    setDialogKey((currentKey) => currentKey + 1)
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
  }

  return (
    <>
      <button
        {...buttonProps}
        type="button"
        className={buttonClassName}
        onClick={handleOpen}
      >
        <Export01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
      </button>

      <DialogExportMaster
        key={`export-master-${type}-${dialogKey}`}
        isOpen={isDialogOpen}
        type={type}
        masterLabel={masterLabel}
        onClose={handleClose}
      />
    </>
  )
}

export default ButtonExportMaster
