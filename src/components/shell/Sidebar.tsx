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
import styles from '@styles/components/shell/Sidebar.module.scss';

type NavItem = { sec?: string; k?: string; l?: string; icon?: typeof IconLayoutDashboard; to?: string; count?: string };

/* Mock active client id for client-scoped routes — replaced by useActiveClient() later. */
const MOCK_CLIENT_ID = 'cli_khukri';

const NAV: NavItem[] = [
  { sec: 'Agency' },
  { k: 'overview', l: 'Overview', icon: IconLayoutDashboard, to: '/dashboard' },
  { k: 'clients', l: 'All clients', icon: IconUsersGroup, to: '/clients', count: '8' },

  { sec: 'Khukri Spices' },
  { k: 'contacts', l: 'Contacts', icon: IconAddressBook, to: `/clients/${MOCK_CLIENT_ID}/contacts` },
  { k: 'lists', l: 'Lists', icon: IconTags, to: `/clients/${MOCK_CLIENT_ID}/lists` },
  { k: 'templates', l: 'Templates', icon: IconTemplate, to: `/clients/${MOCK_CLIENT_ID}/templates` },
  { k: 'campaigns', l: 'Campaigns', icon: IconSend, to: `/clients/${MOCK_CLIENT_ID}/campaigns` },
  { k: 'flows', l: 'Flows', icon: IconRoute, to: `/clients/${MOCK_CLIENT_ID}/flows` },
  { k: 'forms', l: 'Forms', icon: IconForms, to: `/clients/${MOCK_CLIENT_ID}/forms` },
  { k: 'reports', l: 'Reports', icon: IconChartBar, to: `/clients/${MOCK_CLIENT_ID}/reports` },

  { sec: 'Settings' },
  { k: 'team', l: 'Team', icon: IconUsers, to: '/team' },
  { k: 'audit', l: 'Activity log', icon: IconHistory, to: '/audit' },
  { k: 'integrations', l: 'Integrations', icon: IconPlug, to: '/integrations' },
  { k: 'billing', l: 'Billing', icon: IconCreditCard, to: '/billing' },
  { k: 'whitelabel', l: 'White-label', icon: IconPalette, to: '/whitelabel' },
];

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {NAV.map((n, i) => {
          if (n.sec) return <div key={`sec-${i}`} className={styles.label}>{n.sec}</div>;
          const Icon = n.icon!;
          return (
            <NavLink
              key={n.k}
              to={n.to!}
              className={({ isActive }) =>
                `${styles.item} ${isActive ? styles.active : ''}`
              }
            >
              <Icon size={18} />
              {n.l}
              {n.count && <span className={styles.count}>{n.count}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className={styles.foot}>
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `${styles.item} ${isActive ? styles.active : ''}`
          }
        >
          <IconLifebuoy size={18} />
          Help &amp; support
        </NavLink>
      </div>
    </aside>
  );
}
