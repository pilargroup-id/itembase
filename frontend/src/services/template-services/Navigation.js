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
  '/pic-categories',
  '/TableActions',
  '/item-types',
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
    id: 'projects-overview',
    label: 'Item Management',
    href: '/Bundling',
    icon: Folder,
    children: [
      {
        id: 'tickes-overview',
        label: 'Parrent',
        href: '/parents',
        icon: Boxes01,
      },
      {
        id: 'projects-overview',
        label: 'Items',
        href: '/items',
        icon: LayersTwo,
      },
      {
        id: 'table-data',
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
        id: 'table-data',
        label: 'Pic Categories',
        href: '/pic-categories',
        icon: Tag01,
      },
      {
        id: 'table-users',
        label: 'Item Types',
        href: '/item-types',
        icon: Shapes,
      },
      {
        id: 'table-users',
        label: 'Ports',
        href: '/ports',
        icon: Anchor,
      },
      {
        id: 'table-users',
        label: 'Uoms',
        href: '/uoms',
        icon: Ruler,
      },
      {
        id: 'table-users',
        label: 'Brands',
        href: '/brands',
        icon: Badge,
      },
      {
        id: 'table-users',
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
