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
  UserCheck,
  UserCog,
  LayoutDashboard,
} from '../../components/template/TemplateIcons.jsx'

export const defaultNavigationPath = '/parents'

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
  '/activity-logs',
  '/variant',
]

export const primaryNavigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'nav-item-management',
    label: 'Item Management',
    href: '/Bundling',
    icon: Folder,
    children: [
      {
        id: 'nav-parents',
        label: 'Parent',
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
      },
      {
        id: 'nav-brands',
        label: 'Brands',
        href: '/brands',

      },
      {
        id: 'nav-types',
        label: 'Source',
        href: '/types',
      },
      {
        id: 'nav-ports',
        label: 'Ports',
        href: '/ports',
      },
      {
        id: 'nav-uoms',
        label: 'Uoms',
        href: '/uoms',
      },
      {
        id: 'variant',
        label: 'Variant',
        href: '/variant',
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
