import CreateButton from '../CreateButton.jsx'
import { Trash03 } from '../../template/TemplateIcons.jsx'

function ButtonDeleteBrand({ className = '', title = 'Delete', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="icon"
      type="button"
      tone="danger"
      className={['parent-action-button parent-action-button--delete', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Trash03 size={17} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonDeleteBrand
