import { SearchMd, XClose } from '../template/TemplateIcons.jsx'

function SearchVariant({
  value = '',
  onChange,
  placeholder = 'Cari variant, attribute, value, kode...',
  ariaLabel = 'Cari variant',
}) {
  const handleClear = () => {
    onChange?.({ target: { value: '' } })
  }

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
      {value ? (
        <button
          type="button"
          className="parent-search__clear"
          onClick={handleClear}
          aria-label="Bersihkan pencarian"
        >
          <XClose size={14} aria-hidden="true" />
        </button>
      ) : null}
    </label>
  )
}

export default SearchVariant
