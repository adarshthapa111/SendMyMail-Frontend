import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { IconPlus } from '@tabler/icons-react';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { CampaignCard } from '../../components/campaigns';
import { useCampaigns } from '../../hooks/useCampaigns';
import type { CampaignSummary, CampaignStatus } from '../../lib/api/campaigns';
import { ApiError } from '../../lib/api/client';
import { toast } from '../../lib/toast';
import styles from '@styles/components/campaigns/CampaignsList.module.scss';

type Tab = 'all' | CampaignStatus;

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all',       label: 'All' },
  { id: 'draft',     label: 'Drafts' },
  { id: 'sending',   label: 'Sending' },
  { id: 'sent',      label: 'Sent' },
  { id: 'failed',    label: 'Failed' },
];

/* /clients/:clientId/campaigns — list of all campaigns for this client.
   Card grid, status-filtered tabs, "New campaign" CTA. Per
   doc/mockups/campaigns_list.html. */
export function CampaignsList() {
  const { clientId = null } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const camps = useCampaigns(clientId);
  const [tab, setTab] = useState<Tab>('all');
  const [creating, setCreating] = useState(false);

  const visible = useMemo<CampaignSummary[]>(() => {
    const nonArchived = camps.items.filter((c) => !c.archived);
    if (tab === 'all') return nonArchived;
    return nonArchived.filter((c) => c.status === tab);
  }, [camps.items, tab]);

  async function onNewCampaign() {
    if (!clientId || creating) return;
    setCreating(true);
    try {
      // Create draft with a placeholder name — user renames in Step 1
      const camp = await camps.create({ name: 'Untitled campaign' });
      navigate(`/clients/${clientId}/campaigns/${camp.id}/edit`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message
                : err instanceof Error    ? err.message
                : 'Failed to create campaign';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  }

  if (camps.status === 'loading' || camps.status === 'idle') {
    return (
      <div className={styles.center}>
        <Spinner />
      </div>
    );
  }

  if (camps.status === 'error') {
    return (
      <div className={styles.center}>
        <Text tone="muted">Couldn't load campaigns: {camps.error}</Text>
      </div>
    );
  }

  const isEmpty = camps.items.filter((c) => !c.archived).length === 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <Heading size="xl">Campaigns</Heading>
          <Text tone="muted" className={styles.subtitle}>
            Send a designed template to a contact list
          </Text>
        </div>
        <Button variant="primary" leading={<IconPlus size={16} />} onClick={onNewCampaign} disabled={creating}>
          {creating ? 'Creating…' : 'New campaign'}
        </Button>
      </header>

      {!isEmpty && (
        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => {
            const count = t.id === 'all'
              ? camps.items.filter((c) => !c.archived).length
              : camps.items.filter((c) => !c.archived && c.status === t.id).length;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className={styles.tabCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {isEmpty ? (
        <div className={styles.empty}>
          <Heading size="md">No campaigns yet</Heading>
          <Text tone="muted" className={styles.emptyHint}>
            Build your first campaign — pick a template and a list, write the
            subject, and send. We'll handle the rest.
          </Text>
          <Button variant="primary" leading={<IconPlus size={16} />} onClick={onNewCampaign} disabled={creating}>
            {creating ? 'Creating…' : 'New campaign'}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.emptyTab}>
          <Text tone="muted">No campaigns in this filter.</Text>
        </div>
      ) : (
        <div className={styles.grid}>
          {visible.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              onClick={() => {
                if (c.status === 'draft') {
                  navigate(`/clients/${clientId}/campaigns/${c.id}/edit`);
                } else {
                  navigate(`/clients/${clientId}/campaigns/${c.id}`);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
