import {
  Anchor,
  Badge,
  Boxes01,
  Folder,
  LayersTwo,
  LogOutLeft01,
  Ruler,
  Shapes,
  Table01,
  Tag01,
  Ticket01,
  Users01,
} from '../../components/template/TemplateIcons.jsx'

export const defaultNavigationPath = '/dashboard'

export const implementedNavigationPaths = [
  '/dashboard',
  '/parents',
  '/items',
  '/bundles',
  '/TableActions',
  '/types',
  '/ports',
  '/uoms',
  '/brands',
  '/pics',
]

export const primaryNavigationItems = [
  {
    id: 'my-tickets',
    label: 'Dashboard',
    href: '/dashboard',
    icon: Ticket01,
  },
  {
    id: 'nav-item-management',
    label: 'Item Management',
    href: '/Bundling',
    icon: Folder,
    children: [
      {
        id: 'nav-parents',
        label: 'Parrent',
        href: '/parents',
        icon: Boxes01,
      },
      {
        id: 'nav-items',
        label: 'Items',
        href: '/items',
        icon: LayersTwo,
      },
      {
        id: 'nav-bundles',
        label: 'Bundles',
        href: '/bundles',
        icon: Tag01,
      },
    ],
  },
  {
    id: 'table',
    label: 'Master',
    icon: Table01,
    children: [
      {
        id: 'nav-brands',
        label: 'Brands',
        href: '/brands',
        icon: Badge,
      },
      {
        id: 'nav-types',
        label: 'Types',
        href: '/types',
        icon: Shapes,
      },
      {
        id: 'nav-ports',
        label: 'Ports',
        href: '/ports',
        icon: Anchor,
      },
      {
        id: 'nav-uoms',
        label: 'Uoms',
        href: '/uoms',
        icon: Ruler,
      },
      {
        id: 'nav-pics',
        label: 'Pics',
        href: '/pics',
        icon: Users01,
      },
    ],
  },
]

export const secondaryNavigationItems = [
  {
    id: 'back-pilargroup',
    label: 'Back Pilargroup',
    href: 'https://pilargroup.id/dashboard',
    icon: LogOutLeft01,
    external: true,
  },
]
