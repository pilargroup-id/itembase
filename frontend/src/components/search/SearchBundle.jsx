import { SearchMd } from '../template/TemplateIcons.jsx'

function SearchBundle({
  value = '',
  onChange,
  placeholder = 'Cari bundle...',
  ariaLabel = 'Cari bundle',
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

export default SearchBundle
