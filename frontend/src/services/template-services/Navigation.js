import {
  Badge,
  Barcode,
  Boxes01,
  FileText01,
  Folder,
  Globe,
  LayersTwo,
  List,
  LogOutLeft01,
  Ruler,
  Shapes,
  Settings01,
  Table01,
  Tag01,
  Ticket01,
  UserCheck,
  UserCog,
} from '../../components/template/TemplateIcons.jsx'

export const defaultNavigationPath = '/dashboard'

export const implementedNavigationPaths = [
  '/dashboard',
  '/parents',
  '/items',
  '/bundles',
  '/categories',
  '/types',
  '/ports',
  '/uoms',
  '/brands',
  '/pics',
  '/pic-users',
  '/sku-statuses',
  '/activity-logs',
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
        id: 'nav-categories',
        label: 'Categories',
        href: '/categories',
        icon: List,
      },
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
        icon: Globe,
      },
      {
        id: 'nav-uoms',
        label: 'Uoms',
        href: '/uoms',
        icon: Ruler,
      },
      {
        id: 'nav-pics',
        label: 'Pic Group',
        href: '/pics',
        icon: UserCheck,
      },
      {
        id: 'nav-pic-users',
        label: 'Pic Users',
        href: '/pic-users',
        icon: UserCog,
      },
      {
        id: 'nav-sku-statuses',
        label: 'SKU Status',
        href: '/sku-statuses',
        icon: Barcode,
      }
    ],
  },
]

export const secondaryNavigationItems = [
  {
    id: 'nav-setting',
    label: 'Setting',
    icon: Settings01,
    children: [
      {
        id: 'nav-logs',
        label: 'Logs',
        href: '/activity-logs',
        icon: FileText01,
      },
    ],
  },
  {
    id: 'back-pilargroup',
    label: 'Back Pilargroup',
    href: 'https://pilargroup.id/dashboard',
    icon: LogOutLeft01,
    external: true,
  },
]
