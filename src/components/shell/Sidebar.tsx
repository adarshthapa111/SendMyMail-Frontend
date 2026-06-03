import { NavLink } from 'react-router-dom';
import {
  IconLayoutDashboard,
  IconUsersGroup,
  IconAddressBook,
  IconTags,
  IconTemplate,
  IconSend,
  IconRoute,
  IconForms,
  IconChartBar,
  IconUsers,
  IconHistory,
  IconPlug,
  IconCreditCard,
  IconPalette,
  IconLifebuoy,
} from '@tabler/icons-react';
import { useClients } from '../../hooks/useClients';
import styles from '@styles/components/shell/Sidebar.module.scss';

type NavItem = { k: string; l: string; icon: typeof IconLayoutDashboard; to: string; count?: string | number };

const AGENCY_NAV: NavItem[] = [
  { k: 'overview', l: 'Overview',    icon: IconLayoutDashboard, to: '/dashboard' },
  { k: 'clients',  l: 'All clients', icon: IconUsersGroup,      to: '/clients' },
];

function perClient(id: string): NavItem[] {
  return [
    { k: 'contacts',  l: 'Contacts',  icon: IconAddressBook, to: `/clients/${id}/contacts`  },
    { k: 'lists',     l: 'Lists',     icon: IconTags,        to: `/clients/${id}/lists`     },
    { k: 'templates', l: 'Templates', icon: IconTemplate,    to: `/clients/${id}/templates` },
    { k: 'campaigns', l: 'Campaigns', icon: IconSend,        to: `/clients/${id}/campaigns` },
    { k: 'flows',     l: 'Flows',     icon: IconRoute,       to: `/clients/${id}/flows`     },
    { k: 'forms',     l: 'Forms',     icon: IconForms,       to: `/clients/${id}/forms`     },
    { k: 'reports',   l: 'Reports',   icon: IconChartBar,    to: `/clients/${id}/reports`   },
  ];
}

const SETTINGS_NAV: NavItem[] = [
  { k: 'team',         l: 'Team',         icon: IconUsers,      to: '/team' },
  { k: 'audit',        l: 'Activity log', icon: IconHistory,    to: '/audit' },
  { k: 'integrations', l: 'Integrations', icon: IconPlug,       to: '/integrations' },
  { k: 'billing',      l: 'Billing',      icon: IconCreditCard, to: '/billing' },
  { k: 'whitelabel',   l: 'White-label',  icon: IconPalette,    to: '/whitelabel' },
];

export function Sidebar() {
  const { items, active } = useClients();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        <div className={styles.label}>Agency</div>
        {AGENCY_NAV.map((n) => (
          <NavItemRow
            key={n.k}
            item={{ ...n, count: n.k === 'clients' && items.length > 0 ? items.length : undefined }}
          />
        ))}

        {active ? (
          <>
            <div className={styles.label}>{active.name}</div>
            {perClient(active.id).map((n) => <NavItemRow key={n.k} item={n} />)}
          </>
        ) : null}

        <div className={styles.label}>Settings</div>
        {SETTINGS_NAV.map((n) => <NavItemRow key={n.k} item={n} />)}
      </nav>

      <div className={styles.foot}>
        <NavLink
          to="/help"
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <IconLifebuoy size={18} />
          Help &amp; support
        </NavLink>
      </div>
    </aside>
  );
}

function NavItemRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
    >
      <Icon size={18} />
      {item.l}
      {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
    </NavLink>
  );
}
