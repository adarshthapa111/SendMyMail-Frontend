import { useNavigate } from 'react-router-dom';
import { IconPlus, IconUsersGroup } from '@tabler/icons-react';
import { Heading, Text, Button } from '../ui';
import { EmptyMetric } from './EmptyMetric';
import { clientGradient, clientInitials } from '../../lib/clientColor';
import type { OverviewPayload, ClientStatus } from '../../lib/api/overview';
import styles from '@styles/components/dashboard/ClientsHealthList.module.scss';

interface Props {
  clients: OverviewPayload['top_clients'];
  totalActive: number;
}

const STATUS_DOT: Record<ClientStatus, string> = {
  active:   styles.dotGreen,
  trial:    styles.dotBlue,
  paused:   styles.dotGray,
  archived: styles.dotRed,
};

const STATUS_LABEL: Record<ClientStatus, string> = {
  active:   'Active',
  trial:    'Trial',
  paused:   'Paused',
  archived: 'Archived',
};

function fmtLastActivity(iso: string | null): string {
  if (!iso) return 'No activity yet';
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((now - then) / 60_000));
  if (diffMin < 60) return diffMin <= 1 ? 'Updated just now' : `Updated ${diffMin} min ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `Updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`;
  return `Updated ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/* "How your clients are doing" — top 5 clients by last_activity DESC.
   Per-client open-rate / revenue cells render <EmptyMetric inline /> until
   Feature 10 ships per-client metric aggregation. */
export function ClientsHealthList({ clients, totalActive }: Props) {
  const navigate = useNavigate();

  if (clients.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          <IconUsersGroup size={28} />
        </div>
        <Heading size="md" className={styles.emptyTitle}>No clients yet</Heading>
        <Text tone="muted" className={styles.emptyLede}>
          Create your first client to start running campaigns. Each client gets its own contacts, templates, and sending domain.
        </Text>
        <Button variant="primary" size="lg" leading={<IconPlus size={16} />} onClick={() => navigate('/clients/new')}>
          Add your first client
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={styles.sectionHead}>
        <Heading size="lg">How your clients are doing</Heading>
        <a className={styles.viewAll} onClick={() => navigate('/clients')}>
          View all {totalActive} →
        </a>
      </div>

      <div className={styles.card}>
        {clients.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.row}
            onClick={() => navigate(`/clients/${c.id}/contacts`)}
          >
            <span
              className={styles.av}
              style={{ background: clientGradient(c.avatar_color) }}
              aria-hidden="true"
            >
              {clientInitials(c.name)}
            </span>
            <div className={styles.main}>
              <div className={styles.name}>{c.name}</div>
              <div className={styles.sub}>
                {c.last_campaign_subject ?? fmtLastActivity(c.last_activity_iso)}
              </div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {c.open_rate === null ? <EmptyMetric inline /> : `${c.open_rate.toFixed(1)}%`}
              </div>
              <div className={styles.statKey}>open</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statValue}>
                {c.revenue === null ? <EmptyMetric inline /> : `रू ${c.revenue.toLocaleString()}`}
              </div>
              <div className={styles.statKey}>revenue</div>
            </div>
            <div className={styles.statusCol}>
              <span className={`${styles.sdot} ${STATUS_DOT[c.status]}`} />
              {STATUS_LABEL[c.status]}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
