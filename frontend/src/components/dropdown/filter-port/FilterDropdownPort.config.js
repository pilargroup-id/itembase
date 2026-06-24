export const PortFilterConfig = [
    {
        key: "status",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
        ],
        getValue: (Port) => String(Port.status ?? "").toLowerCase(),
    },
]
