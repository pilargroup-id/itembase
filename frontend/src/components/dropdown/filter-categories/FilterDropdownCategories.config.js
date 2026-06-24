function getCategoriesStatusValue(categories) {
    if (categories?.is_active !== undefined && categories?.is_active !== null) {
        return Number(categories.is_active) === 1 ? "1" : "0"
    }

    const normalizedStatus = String(categories?.status ?? "").toLowerCase()

    if (normalizedStatus === "active") {
        return "1"
    }

    if (normalizedStatus === "inactive") {
        return "0"
    }

    return ""
}

export const categoriesFilterConfig = [
    {
        key: "status",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        apiParam: "is_active",
        options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
        ],
        getValue: getCategoriesStatusValue,
    },
]
