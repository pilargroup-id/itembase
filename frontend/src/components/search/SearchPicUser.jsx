import { SearchMd, XClose } from '../template/TemplateIcons.jsx'

function SearchPicUser({
  value = '',
  onChange,
  placeholder = 'Cari PIC user, kode PIC, central user ID...',
  ariaLabel = 'Cari PIC user',
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

export default SearchPicUser
