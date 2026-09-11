import { useEffect, useRef, useState } from 'react'

import { Bell04, ChevronDown, Menu01, SearchMd, User01, XClose } from './TemplateIcons.jsx'
import logoPiagamMark from '../../images/logo-piagam.svg'
import {
  defaultNavigationPath,
  implementedNavigationPaths,
  primaryNavigationItems,
  secondaryNavigationItems,
} from '../../services/template-services/Navigation.js'
import '../../styles/template-style/TemplateComponents.css'

function getItemKey(item) {
  return item.id ?? item.href ?? item.label
}

function isItemActive(item, currentPath) {
  if (item.href === currentPath) {
    return true
  }

  return item.children?.some((child) => isItemActive(child, currentPath)) ?? false
}

function HeaderNavItem({ item, activePath, openKey, onOpen, onSelect }) {
  const Icon = item.icon
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, activePath)
  const itemKey = getItemKey(item)
  const isOpen = openKey === itemKey
  const isButton = hasChildren || !item.href

  const wrapperClassName = [
    'header-nav-item-wrapper',
    isOpen ? 'header-nav-item-wrapper--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const itemClassName = [
    'header-nav-item',
    active ? 'active' : '',
    item.variant === 'danger' ? 'header-nav-item--danger' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleClick = (event) => {
    if (hasChildren) {
      event.preventDefault()
      onOpen(isOpen ? null : itemKey)
      return
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    onSelect(item)
  }

  const content = (
    <>
      {Icon && item.showIcon ? <Icon className="header-nav-item__icon" size={16} /> : null}
      <span className="header-nav-item__label">{item.label}</span>
      {hasChildren ? <ChevronDown className="header-nav-item__chevron" size={14} /> : null}
    </>
  )

  return (
    <div
      className={wrapperClassName}
      onMouseEnter={() => hasChildren && onOpen(itemKey)}
      onMouseLeave={() => hasChildren && onOpen(null)}
    >
      {isButton ? (
        <button
          type="button"
          className={itemClassName}
          aria-haspopup={hasChildren ? 'true' : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-current={active && !hasChildren ? 'page' : undefined}
          onClick={handleClick}
        >
          {content}
        </button>
      ) : (
        <a
          href={item.href}
          className={itemClassName}
          aria-current={active ? 'page' : undefined}
          onClick={handleClick}
        >
          {content}
        </a>
      )}

      {hasChildren ? (
        <div className="header-nav-dropdown" role="menu" aria-hidden={!isOpen}>
          {item.children.map((child) => {
            const ChildIcon = child.icon
            const childActive = isItemActive(child, activePath)

            return (
              <a
                key={getItemKey(child)}
                href={child.href}
                role="menuitem"
                className={`header-nav-dropdown__item${childActive ? ' active' : ''}`}
                aria-current={childActive ? 'page' : undefined}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey ||
                    event.button !== 0
                  ) {
                    return
                  }

                  event.preventDefault()
                  onSelect(child)
                }}
              >
                {ChildIcon ? <ChildIcon size={18} /> : null}
                <span>{child.label}</span>
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function Header({
  title = 'Item Base',
  activePath = '/parents',
  userName = 'Al fatih',
  userRole = 'Frontend Developer',
  primaryItems = primaryNavigationItems,
  secondaryItems = secondaryNavigationItems,
  onAction,
}) {
  const [openKey, setOpenKey] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    if (!openKey && !mobileNavOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (navRef.current?.contains(event.target)) {
        return
      }

      setOpenKey(null)
      setMobileNavOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenKey(null)
        setMobileNavOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openKey, mobileNavOpen])

  useEffect(() => {
    setOpenKey(null)
    setMobileNavOpen(false)
  }, [activePath])

  const handleSelect = (item) => {
    if (item.external && item.href) {
      window.location.assign(item.href)
      setOpenKey(null)
      setMobileNavOpen(false)
      return
    }

    if (item.action) {
      onAction?.(item.action, item)
      setOpenKey(null)
      setMobileNavOpen(false)
      return
    }

    if (!item.href) {
      return
    }

    if (implementedNavigationPaths.includes(item.href)) {
      const nextPath = item.href || defaultNavigationPath

      if (window.location.pathname !== nextPath) {
        window.history.pushState({}, '', nextPath)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }
    }

    setOpenKey(null)
    setMobileNavOpen(false)
  }

  const navListClassName = [
    'header-nav-list',
    mobileNavOpen ? 'header-nav-list--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className="header-main">
      <div className="header-content">
        <div className="header-left">
          <button
            type="button"
            className="header-menu-button"
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((current) => !current)}
          >
            {mobileNavOpen ? <XClose size={20} /> : <Menu01 size={20} />}
          </button>

          <div className="header-brand">
            <span className="header-brand-title">{title}</span>
          </div>
        </div>

        <div className="header-search">
          <SearchMd className="header-search__icon" size={18} />
          <input
            type="search"
            className="header-search__input"
            placeholder="Search or type command..."
            aria-label="Search"
          />
          <span className="header-search__shortcut">⌘K</span>
        </div>

        <div className="header-right">
          <button type="button" className="header-icon-button" aria-label="Notifications">
            <Bell04 size={19} />
            <span className="header-icon-button__dot" aria-hidden="true" />
          </button>

          <button
            type="button"
            className="header-profile-button"
            aria-label="Profile"
            title={userRole || undefined}
          >
            <User01 size={18} />
            <span className="header-profile-button__name">{userName}</span>
          </button>
        </div>
      </div>

      <nav className="header-nav" aria-label="Main navigation" ref={navRef}>
        <div className={navListClassName}>
          <img src={logoPiagamMark} alt="" aria-hidden="true" className="header-nav-logo" />

          {primaryItems.map((item) => (
            <HeaderNavItem
              key={getItemKey(item)}
              item={item}
              activePath={activePath}
              openKey={openKey}
              onOpen={setOpenKey}
              onSelect={handleSelect}
            />
          ))}

          <div className="header-nav-list__secondary">
            {secondaryItems.map((item) => (
              <HeaderNavItem
                key={getItemKey(item)}
                item={item}
                activePath={activePath}
                openKey={openKey}
                onOpen={setOpenKey}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </nav>

      {mobileNavOpen ? (
        <button
          type="button"
          className="header-nav-overlay active"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
    </header>
  )
}

export default Header
