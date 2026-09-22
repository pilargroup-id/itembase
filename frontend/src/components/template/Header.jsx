import { useEffect, useRef, useState, useCallback } from 'react'

import { Bell04, ChevronDown, Menu01, User01, XClose } from './TemplateIcons.jsx'
import logoPiagamMark from '../../images/logo-piagam.svg'
import {
  defaultNavigationPath,
  implementedNavigationPaths,
  primaryNavigationItems,
  profileMenuItems,
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

function NotificationModal({ isOpen, notificationData, onClose }) {
  if (!isOpen) return null

  return (
    <div className="header-modal-overlay" onClick={onClose}>
      <div className="header-modal" onClick={(e) => e.stopPropagation()}>
        <div className="header-modal__header">
          <h2 className="header-modal__title">Notifications</h2>
          <button
            type="button"
            className="header-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="header-modal__body">
          {notificationData.length > 0 ? (
            <div className="notification-list">
              {notificationData.map((item, idx) => (
                <div key={idx} className="notification-item">
                  <div className="notification-item__time">
                    {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                  </div>
                  <div className="notification-item__content">
                    <strong>{item.action || 'Activity'}</strong>
                    <div className="notification-item__detail">{item.description || item.message}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notification-empty">No activities yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileDropdown({ isOpen, userName, userRole, profileMenuItems, onSelect, onClose }) {
  return (
    <div
      className={[
        'header-nav-item-wrapper',
        'header-profile-wrapper',
        isOpen ? 'header-nav-item-wrapper--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="header-profile-button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Profile"
        title={userRole || undefined}
        onClick={onClose}
      >
        <User01 size={18} />
        <span className="header-profile-button__name">{userName}</span>
        <ChevronDown className="header-nav-item__chevron" size={14} />
      </button>

      <div className="header-nav-dropdown header-profile-dropdown" role="menu" aria-hidden={!isOpen}>
        {profileMenuItems.map((item) => (
          <a
            key={getItemKey(item)}
            href={item.href}
            role="menuitem"
            className="header-nav-dropdown__item"
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
              onSelect(item)
            }}
          >
            {item.icon ? <item.icon size={18} /> : null}
            <span>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

function MobileMenuOverlay({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <button
      type="button"
      className="header-nav-overlay active"
      aria-label="Close navigation"
      onClick={onClose}
    />
  )
}

function HeaderNavItem({ item, activePath, openKey, onOpen, onSelect }) {
  const Icon = item.icon
  const hasChildren = item.children?.length > 0
  const active = isItemActive(item, activePath)
  const itemKey = getItemKey(item)
  const isOpen = openKey === itemKey
  const isButton = hasChildren || !item.href
  const closeTimeoutRef = useRef(null)

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

  const handleMouseLeave = useCallback(() => {
    if (!hasChildren) return

    closeTimeoutRef.current = setTimeout(() => {
      onOpen(null)
    }, 120)
  }, [hasChildren, onOpen])

  const handleMouseEnter = useCallback(() => {
    if (!hasChildren) return

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    onOpen(itemKey)
  }, [hasChildren, itemKey, onOpen])

  return (
    <div
      className={wrapperClassName}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
        <div
          className="header-nav-dropdown"
          role="menu"
          aria-hidden={!isOpen}
          onMouseEnter={() => {
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current)
              closeTimeoutRef.current = null
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
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
  activePath = '/parents',
  userName = 'Al fatih',
  userRole = 'Frontend Developer',
  primaryItems = primaryNavigationItems,
  secondaryItems = secondaryNavigationItems,
  onAction,
}) {
  const [openKey, setOpenKey] = useState(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationData, setNotificationData] = useState([])
  const navRef = useRef(null)

  useEffect(() => {
    if (!openKey && !mobileNavOpen && !profileOpen && !notificationOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (navRef.current?.contains(event.target)) {
        return
      }

      setOpenKey(null)
      setMobileNavOpen(false)
      setProfileOpen(false)
      setNotificationOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpenKey(null)
        setMobileNavOpen(false)
        setProfileOpen(false)
        setNotificationOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openKey, mobileNavOpen, profileOpen, notificationOpen])

  useEffect(() => {
    setOpenKey(null)
    setMobileNavOpen(false)
    setProfileOpen(false)
    setNotificationOpen(false)
  }, [activePath])

  const handleNotificationClick = async () => {
    if (notificationOpen) {
      setNotificationOpen(false)
      return
    }

    setNotificationOpen(true)
    try {
      const response = await fetch('/api/activity-logs')
      if (response.ok) {
        const data = await response.json()
        setNotificationData(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error)
    }
  }

  const handleSelect = (item) => {
    if (item.external && item.href) {
      window.location.assign(item.href)
      setOpenKey(null)
      setMobileNavOpen(false)
      setProfileOpen(false)
      return
    }

    if (item.action) {
      onAction?.(item.action, item)
      setOpenKey(null)
      setMobileNavOpen(false)
      setProfileOpen(false)
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
    setProfileOpen(false)
  }

  const navListClassName = [
    'header-nav-list',
    mobileNavOpen ? 'header-nav-list--open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <header className="header-main">
      <nav className="header-nav" aria-label="Main navigation" ref={navRef}>
        <button
          type="button"
          className="header-menu-button"
          aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((current) => !current)}
        >
          {mobileNavOpen ? <XClose size={20} /> : <Menu01 size={20} />}
        </button>

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

        <div className="header-nav-actions">
          <button
            type="button"
            className="header-icon-button"
            aria-label="Notifications"
            onClick={handleNotificationClick}
          >
            <Bell04 size={19} />
            <span className="header-icon-button__dot" aria-hidden="true" />
          </button>

          <ProfileDropdown
            isOpen={profileOpen}
            userName={userName}
            userRole={userRole}
            profileMenuItems={profileMenuItems}
            onSelect={handleSelect}
            onClose={() => setProfileOpen((current) => !current)}
          />
        </div>
      </nav>

      <MobileMenuOverlay isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <NotificationModal isOpen={notificationOpen} notificationData={notificationData} onClose={() => setNotificationOpen(false)} />
    </header>
  )
}

export default Header
