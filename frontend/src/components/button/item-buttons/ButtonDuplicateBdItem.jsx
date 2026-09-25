import CreateButton from '../CreateButton.jsx'
import { Copy01 } from '../../template/TemplateIcons.jsx'

function ButtonDuplicateBdItem({ className = '', title = 'Duplicate to BD', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="icon"
      type="button"
      className={['parent-action-button parent-action-button--duplicate', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Copy01 size={17} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonDuplicateBdItem
