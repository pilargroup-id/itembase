import CreateButton from '../CreateButton.jsx'
import { Edit03 } from '../../template/TemplateIcons.jsx'

function ButtonEditPicUser({ className = '', title = 'Edit', ...buttonProps }) {
  return (
    <CreateButton
      {...buttonProps}
      variant="icon"
      type="button"
      className={['parent-action-button parent-action-button--edit', className]
        .filter(Boolean)
        .join(' ')}
      aria-label={buttonProps['aria-label'] ?? title}
      title={title}
    >
      <Edit03 size={17} aria-hidden="true" />
    </CreateButton>
  )
}

export default ButtonEditPicUser
