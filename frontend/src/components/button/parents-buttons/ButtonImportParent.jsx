import { Upload01 } from '../../template/TemplateIcons.jsx'

function ButtonImportParent({
  className = '',
  children = 'Import',
  iconSize = 18,
  onClick,
  type = 'button',
  ...buttonProps
}) {
  const buttonClassName = [
    'users-table-card__action parent-table-tool-button parent-table-tool-button--import',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button {...buttonProps} type={type} className={buttonClassName} onClick={onClick}>
      <Upload01 size={iconSize} aria-hidden="true" />
      <span>{children}</span>
    </button>
  )
}

export default ButtonImportParent
