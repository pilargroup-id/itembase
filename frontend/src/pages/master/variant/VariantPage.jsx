import { useState } from 'react'
import ButtonCreateVariant from '../../../components/button/variant-buttons/ButtonCreateVariant.jsx'
import ButtonImportMaster from '../../../components/button/master-buttons/ButtonImportMaster.jsx'
import SearchVariant from '../../../components/search/SearchVariant.jsx'
import DataTableVariantAttributes from '../../../components/table/dekstop/master/DataTableVariantAttributes.jsx'
import DataTableVariantValue from '../../../components/table/dekstop/master/DataTableVariantValue.jsx'

function VariantPage({ activePage, searchQuery, onSearchQueryChange }) {
  const [uomRefreshKey, setUomRefreshKey] = useState(0)
  const [activeVariantTab, setActiveVariantTab] = useState('attributes')

  const variantTabs = [
    { id: 'attributes', label: 'Attributs' },
    { id: 'value', label: 'Value' },
  ]

  return (
    <section
      className="dashboard-panel users-table-card parents-table-card variant-table-card"
      aria-label={activePage.title}
    >
      <div className="users-table-card__header">
        <div>
          <p className="dashboard-panel__eyebrow">{activePage.eyebrow}</p>
          <h1 className="dashboard-panel__title">{activePage.title}</h1>
        </div>

        <div className="users-table-card__actions">
          <SearchVariant value={searchQuery} onChange={onSearchQueryChange} />
          <ButtonCreateVariant
            variantType={activeVariantTab}
            children={
              activeVariantTab === 'attributes'
                ? 'Create Attribute'
                : 'Create Value'
            }
            onCreated={() => setUomRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

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

        <div className="variant-table-tabs__actions">
          <ButtonImportMaster
            type={activeVariantTab === 'attributes' ? 'variant-attributes' : 'variant-values'}
            masterLabel={activeVariantTab === 'attributes' ? 'Variant Attribute' : 'Variant Value'}
            aria-label={
              activeVariantTab === 'attributes'
                ? 'Import variant attribute data'
                : 'Import variant value data'
            }
            onImported={() => setUomRefreshKey((currentKey) => currentKey + 1)}
          />
        </div>
      </div>

      {activeVariantTab === 'attributes' ? (
        <DataTableVariantAttributes
          searchQuery={searchQuery}
          tableLabel={`${activePage.title} attributes table`}
          refreshKey={uomRefreshKey}
        />
      ) : (
        <DataTableVariantValue
          searchQuery={searchQuery}
          tableLabel={`${activePage.title} value table`}
          refreshKey={uomRefreshKey}
        />
      )}
    </section>
  )
}

export default VariantPage
