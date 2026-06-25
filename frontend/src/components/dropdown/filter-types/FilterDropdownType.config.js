export const TypeFilterConfig = [
    {
        key: "status",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
        ],
        getValue: (Type) => {
            if (Type?.is_active !== undefined && Type?.is_active !== null) {
                return Number(Type.is_active) === 1 ? "1" : "0"
            }
            return ""
        },
    },
]
