import { SearchMd } from '../template/TemplateIcons.jsx'

function SearchItem({
  value = '',
  onChange,
  placeholder = 'Cari item...',
  ariaLabel = 'Cari item',
}) {
  return (
    <label className="parent-search" aria-label={ariaLabel}>
      <SearchMd size={18} className="parent-search__icon" aria-hidden="true" />
      <input
        type="search"
        className="parent-search__input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </label>
  )
}

export default SearchItem
