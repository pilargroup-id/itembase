import { useState } from 'react'

import { Upload01 } from '../../template/TemplateIcons.jsx'
import DialogImportMaster from '../../Dialog/dialog-master/DialogImportMaster.jsx'

function ButtonImportMaster({
  type,
  masterLabel = 'Data',
  className = '',
  children = 'Import',
  iconSize = 18,
  onImported,
  ...buttonProps
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogKey, setDialogKey] = useState(0)
  const buttonClassName = [
    'users-table-card__action parent-table-tool-button parent-table-tool-button--import',
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
        <Upload01 size={iconSize} aria-hidden="true" />
        <span>{children}</span>
      </button>

      <DialogImportMaster
        key={`import-master-${type}-${dialogKey}`}
        isOpen={isDialogOpen}
        type={type}
        masterLabel={masterLabel}
        onClose={handleClose}
        onImported={onImported}
      />
    </>
  )
}

export default ButtonImportMaster
