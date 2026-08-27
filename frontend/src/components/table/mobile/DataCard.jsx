import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import api from '../../../services/api.js'

const statusOptions = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" }
]

const defaultSelectedFields = [
    'main_category',
    'sub_category',
    'detail_category',
    'brand_category',
    'pic_name',
    'pic_code',
    'status'
]

const selectedFields = new  Set(selectedFields)

// FUNCTION

function getFilteredFields(fields, selectedFields) {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    if (!normalizedSearch) {
        return optionalFields
    }

    return optionalFields.filter (
        (field) =>
            field.label.toLowerCase().includes(normalizedSearch) ||
            field.key.toLowerCase().includes(normalizedSearch),
    )
}

function getSelectedFields(fields, selectedFields) {
    if (selectedFields.includes("all")) {
        return fields
    }

    if (selectedFields.includes("active") || selectedFields.includes("inactive")) {
        return fields.filter((field) => {
            if (selectedFields.includes("active") && field.key === "status") {
                return field.value === "active"
            }
            if (selectedFields.includes("inactive") && field.key === "status") {
                return field.value === "inactive"
            }
            return true
        })

    }
    return fields.filter((field) => selectedFields.includes(field.key))
}


