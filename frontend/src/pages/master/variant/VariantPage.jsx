import { useState } from 'react'
import DataTableVariantAttributes from '../../../components/table/dekstop/master/DataTableVariantAttributes.jsx'
import DataTableVariantValue from '../../../components/table/dekstop/master/DataTableVariantValue.jsx'

function VariantPage({ activePage, searchQuery, onSearchQueryChange }) {
  const [activeVariantTab, setActiveVariantTab] = useState('attributes')

  const variantTabs = [
    { id: 'attributes', label: 'Attributs' },
    { id: 'value', label: 'Value' },
  ]

  return (
    <section
      className="parents-table-card parents-table-page"
      aria-label={activePage.title}
    >
      <div className="variant-table-tabs" role="tablist" aria-label="Variant tabs">
        {variantTabs.map((tab) => {
          const isActive = activeVariantTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              className={`variant-table-tabs__button${
                isActive ? ' variant-table-tabs__button--active' : ''
              }`}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveVariantTab(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeVariantTab === 'attributes' ? (
        <DataTableVariantAttributes
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          tableLabel={`${activePage.title} attributes table`}
        />
      ) : (
        <DataTableVariantValue
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          tableLabel={`${activePage.title} value table`}
        />
      )}
    </section>
  )
}

export default VariantPage
