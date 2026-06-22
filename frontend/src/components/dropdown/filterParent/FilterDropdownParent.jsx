import { useEffect, useMemo, useRef, useState } from "react"

import { ChevronDown } from "../../template/TemplateIcons.jsx"

export const parentFilterConfig = [
    {
        key: "brand",
        label: "Brand",
        placeholder: "All Brand",
        searchPlaceholder: "Search brand...",
        emptyMessage: "Brand not found.",
        getValue: (parent) => parent.brand?.name || parent.sub_brand,
    },
    {
        key: "category",
        label: "Category",
        placeholder: "All Category",
        searchPlaceholder: "Search category...",
        emptyMessage: "Category not found.",
        getValue: (parent) => parent.category?.detail_category,
    },
    {
        key: "subCategory",
        label: "Sub category",
        placeholder: "All Sub category",
        searchPlaceholder: "Search sub category...",
        emptyMessage: "Sub category not found.",
        getValue: (parent) => parent.category?.sub_category,
    },
    {
        key: "status",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        getValue: (parent) => parent.status,
    },
    {
        key: "itemType",
        label: "Item Type",
        placeholder: "All Item Type",
        searchPlaceholder: "Search item type...",
        emptyMessage: "Item type not found.",
        getValue: (parent) => parent.item_type?.name,
    },
    {
        key: "port",
        label: "Port",
        placeholder: "All Port",
        searchPlaceholder: "Search port...",
        emptyMessage: "Port not found.",
        getValue: (parent) => parent.port?.name,
    },
]

function normalizeOption(option) {
    if (typeof option === "object" && option !== null) {
        return {
            value: String(option.value ?? ""),
            label: option.label ?? String(option.value ?? ""),
        }
    }

    return {
        value: String(option ?? ""),
        label: String(option ?? ""),
    }
}

function FilterDropdownParent({
    options = [],
    value = "all",
    label = "Brand",
    placeholder = "Semua Brand",
    searchPlaceholder = "Cari brand...",
    emptyMessage = "Brand tidak ditemukan.",
    className = "",
    onChange,
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const rootRef = useRef(null)
    const searchInputRef = useRef(null)
    const hasActiveValue = String(value ?? "").toLowerCase() !== "all" && String(value ?? "").trim() !== ""
    const normalizedOptions = useMemo(
        () => options.map(normalizeOption).filter((option) => option.value),
        [options],
    )
    const filteredOptions = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase()

        if (!normalizedQuery) {
            return normalizedOptions
        }

        return normalizedOptions.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
        )
    }, [normalizedOptions, searchQuery])
    const selectedValue = String(value ?? "")
    const selectedOption = normalizedOptions.find((option) => option.value === selectedValue) ?? {
        value: selectedValue,
        label: selectedValue || placeholder,
    }

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const closeDropdown = () => {
            setIsOpen(false)
            setSearchQuery("")
        }

        const handlePointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                closeDropdown()
            }
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                closeDropdown()
            }
        }

        document.addEventListener("pointerdown", handlePointerDown)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen) {
            searchInputRef.current?.focus()
        }
    }, [isOpen])

    const handleToggle = () => {
        if (isOpen) {
            setSearchQuery("")
        }

        setIsOpen((currentState) => !currentState)
    }

    const handleSelect = (nextValue) => {
        onChange?.(String(nextValue))
        setIsOpen(false)
        setSearchQuery("")
    }

    return (
        <div
            ref={rootRef}
            className={["year-dropdown-tp", "brand-filter-dropdown", className]
                .filter(Boolean)
                .join(" ")}
        >
            <button
                type="button"
                className={[
                    "year-dropdown-tp__trigger",
                    "year-dropdown-tp__trigger--floating",
                    "year-dropdown-tp__trigger--outlined",
                    isOpen ? "year-dropdown-tp__trigger--open" : "",
                    isOpen || hasActiveValue ? "year-dropdown-tp__trigger--has-value" : "",
                ]
                    .filter(Boolean)
                    .join(" ")}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <span className="year-dropdown-tp__copy year-dropdown-tp__copy--floating">
                    <span
                        className={[
                            "year-dropdown-tp__label",
                            "year-dropdown-tp__label--floating",
                            "year-dropdown-tp__label--outlined",
                            "year-dropdown-tp__label--raised",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        {label}
                    </span>
                    <span className="year-dropdown-tp__value">{selectedOption.label}</span>
                </span>

                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`year-dropdown-tp__chevron${isOpen ? " year-dropdown-tp__chevron--open" : ""}`}
                />
            </button>

            {isOpen ? (
                <div className="year-dropdown-tp__menu" role="listbox" aria-label={label}>
                    <div className="brand-filter-dropdown__search-shell">
                        <input
                            ref={searchInputRef}
                            type="search"
                            className="brand-filter-dropdown__search-input"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={`Cari ${label}`}
                        />
                    </div>

                    <div className="brand-filter-dropdown__options">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = option.value === selectedValue

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        className={[
                                            "year-dropdown-tp__option",
                                            isSelected ? "year-dropdown-tp__option--selected" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => handleSelect(option.value)}
                                    >
                                        <span className="year-dropdown-tp__option-label">{option.label}</span>
                                    </button>
                                )
                            })
                        ) : (
                            <div className="brand-filter-dropdown__empty">{emptyMessage}</div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

export default FilterDropdownParent
