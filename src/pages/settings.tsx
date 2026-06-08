import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IconPlus, IconSparkles, IconAt, IconBell, IconShieldLock, IconBuilding, IconPalette } from '@tabler/icons-react';
import { Heading, Text, Button } from '../components/ui';
import { DomainCardSkeleton } from '../components/skeletons';
import { Placeholder } from './_shared/Placeholder';
import { useSendingDomains } from '../hooks/useSendingDomains';
import { DomainCard } from '../components/settings/DomainCard';
import { AddDomainDialog } from '../components/settings/AddDomainDialog';
import { Appearance } from './settings/Appearance';
import { Profile } from './settings/Profile';
import styles from '@styles/components/settings/Settings.module.scss';

/* /settings (and /settings/:tab) — tabbed settings page.
   ──────────────────────────────────────────────────────
   Feature-send-hardening V1 implements the /settings/sending tab as a
   real surface. Other tabs (profile / notifications / security /
   agency) remain placeholders until their respective feature PRs. */

const TABS = [
  { id: 'profile',       label: 'Profile',       Icon: IconAt },
  { id: 'notifications', label: 'Notifications', Icon: IconBell },
  { id: 'security',      label: 'Security',      Icon: IconShieldLock },
  { id: 'agency',        label: 'Agency',        Icon: IconBuilding },
  { id: 'sending',       label: 'Sending',       Icon: IconSparkles },
  { id: 'appearance',    label: 'Appearance',    Icon: IconPalette },
] as const;

type TabId = typeof TABS[number]['id'];

export function Settings() {
  const { tab } = useParams<{ tab?: string }>();
  const activeTab: TabId = (TABS.find((t) => t.id === tab)?.id) ?? 'profile';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Heading size="xl">Settings</Heading>
        <Text tone="muted" className={styles.subtitle}>
          Workspace, sending, and personal preferences.
        </Text>
      </header>

      <nav className={styles.tabs} role="tablist">
        {TABS.map(({ id, label, Icon }) => (
          <Link
            key={id}
            to={`/settings/${id}`}
            className={`${styles.tab} ${id === activeTab ? styles.tabActive : ''}`}
            role="tab"
            aria-selected={id === activeTab}
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </nav>

      <div className={styles.content}>
        {activeTab === 'sending'    ? <SendingTab /> :
         activeTab === 'appearance' ? <Appearance /> :
         activeTab === 'profile'    ? <Profile /> : (
          <Placeholder
            title={`Settings · ${TABS.find((t) => t.id === activeTab)?.label}`}
            subtitle={`The ${activeTab} tab lands in a later PR.`}
            mockup="settings.html"
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sending tab — sending domains ──────────────────────────────────── */

function SendingTab() {
  const { items, loading, error, add, check, remove } = useSendingDomains();
  const [adding, setAdding] = useState(false);

  return (
    <div className={styles.tabBody}>
      <div className={styles.tabHead}>
        <div>
          <Heading size="md">Sending domain</Heading>
          <Text tone="muted" size="sm" className={styles.tabIntro}>
            Verify a domain so campaigns send from your address. Without
            it, all email goes from <code>onboarding@resend.dev</code> and
            Resend will only deliver to your signup email.
          </Text>
        </div>
        <Button
          variant="primary"
          leading={<IconPlus size={15} />}
          onClick={() => setAdding(true)}
          disabled={loading}
        >
          Add domain
        </Button>
      </div>

      {loading ? (
        <div className={styles.domainList} aria-busy="true">
          <DomainCardSkeleton />
        </div>
      ) : error ? (
        <Text tone="muted">Couldn't load sending domains: {error}</Text>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <IconSparkles size={28} className={styles.emptyIcon} />
          <Heading size="md">No sending domain yet</Heading>
          <Text tone="muted" size="sm" className={styles.emptyHint}>
            Add a subdomain like <code>mail.yourcompany.com</code> to start
            sending campaigns from your own address. DNS changes take 5–30
            minutes; you'll get a copy-and-paste table of records.
          </Text>
          <Button
            variant="primary"
            leading={<IconPlus size={15} />}
            onClick={() => setAdding(true)}
          >
            Add your first domain
          </Button>
        </div>
      ) : (
        <div className={styles.domainList}>
          {items.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              onCheck={async (id) => { await check(id); }}
              onRemove={async (id) => { await remove(id); }}
            />
          ))}
          <div className={styles.quotaHint}>
            <Text size="xs" tone="muted">
              Resend free tier: <strong>{items.length} of 1 domains</strong> used.
              Need more? Upgrade to Pro at resend.com for up to 10.
            </Text>
          </div>
        </div>
      )}

      {adding && (
        <AddDomainDialog
          onAdd={async (name) => { await add(name); }}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
