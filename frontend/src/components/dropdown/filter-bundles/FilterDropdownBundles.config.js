function normalizeOptionValue(value) {
    return String(value ?? "").trim()
}

function createLabel(parts, fallback) {
    const label = parts.map(normalizeOptionValue).filter(Boolean).join(" - ")

    return label || normalizeOptionValue(fallback)
}

function createEntityOption(value, labelParts, fallback = value) {
    const normalizedValue = normalizeOptionValue(value)

    if (!normalizedValue) {
        return null
    }

    return {
        value: normalizedValue,
        label: createLabel(labelParts, fallback),
    }
}

function getNestedId(item, key) {
    return item?.[`${key}_id`] ?? item?.[key]?.id ?? ""
}

function getBrandId(item) {
    return item?.brand_id ?? item?.parent?.brand_id ?? item?.parent?.brand?.id ?? ""
}

export const itemFilterConfig = [
    {
        key: "itemCode",
        apiParam: "item_code",
        label: "Item Code",
        placeholder: "All Item Code",
        searchPlaceholder: "Search item code...",
        emptyMessage: "Item code not found.",
        getValue: (item) => item.item_code,
        getOption: (item) =>
            createEntityOption(item.item_code, [item.item_code, item.item_name]),
    },
    {
        key: "barcode",
        apiParam: "barcode",
        label: "Barcode",
        placeholder: "All Barcode",
        searchPlaceholder: "Search barcode...",
        emptyMessage: "Barcode not found.",
        getValue: (item) => item.barcode,
        getOption: (item) => createEntityOption(item.barcode, [item.barcode, item.item_name]),
    },
    {
        key: "status",
        apiParam: "is_active",
        label: "Status",
        placeholder: "All Status",
        searchPlaceholder: "Search status...",
        emptyMessage: "Status not found.",
        options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
        ],
        getValue: (item) => (Number(item.is_active) === 1 ? "1" : "0"),
    },
    {
        key: "itemKind",
        apiParam: "item_kind",
        label: "Item Kind",
        placeholder: "All Item Kind",
        searchPlaceholder: "Search item kind...",
        emptyMessage: "Item kind not found.",
        options: [
            { value: "regular", label: "Regular" },
            { value: "bundle", label: "Bundle" },
        ],
        getValue: (item) => String(item.item_kind ?? "").toLowerCase(),
    },
    {
        key: "parent",
        apiParam: "parent_id",
        label: "Parent",
        placeholder: "All Parent",
        searchPlaceholder: "Search parent...",
        emptyMessage: "Parent not found.",
        getValue: (item) => getNestedId(item, "parent"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "parent"), [
                item.parent?.parent_code,
                item.parent?.parent_name ?? item.parent?.item_name,
            ]),
    },
    {
        key: "brand",
        apiParam: "brand_id",
        label: "Brand",
        placeholder: "All Brand",
        searchPlaceholder: "Search brand...",
        emptyMessage: "Brand not found.",
        getValue: (item) => getBrandId(item),
        getOption: (item) =>
            createEntityOption(getBrandId(item), [
                item.parent?.brand?.code,
                item.parent?.brand?.name,
            ]),
    },
    {
        key: "skuStatus",
        apiParam: "sku_status_id",
        label: "SKU Status",
        placeholder: "All SKU Status",
        searchPlaceholder: "Search SKU status...",
        emptyMessage: "SKU status not found.",
        getValue: (item) => getNestedId(item, "sku_status"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "sku_status"), [
                item.sku_status?.code,
                item.sku_status?.name,
            ]),
    },
    {
        key: "businessUnit",
        apiParam: "business_unit_id",
        label: "Business Unit",
        placeholder: "All Business Unit",
        searchPlaceholder: "Search business unit...",
        emptyMessage: "Business unit not found.",
        getValue: (item) => getNestedId(item, "business_unit"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "business_unit"), [
                item.business_unit?.code,
                item.business_unit?.name,
            ]),
    },
    {
        key: "uom",
        apiParam: "uom_id",
        label: "UOM",
        placeholder: "All UOM",
        searchPlaceholder: "Search UOM...",
        emptyMessage: "UOM not found.",
        getValue: (item) => getNestedId(item, "uom"),
        getOption: (item) =>
            createEntityOption(getNestedId(item, "uom"), [item.uom?.code, item.uom?.name]),
    },
]
