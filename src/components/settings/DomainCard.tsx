import { useState } from 'react';
import {
  IconCheck, IconRefresh, IconTrash, IconAlertCircle, IconLoader2,
} from '@tabler/icons-react';
import { Button, Text } from '../ui';
import { DnsRecord } from './DnsRecord';
import type { SendingDomain } from '../../lib/api/sendingDomains';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/settings/DomainCard.module.scss';

interface Props {
  domain: SendingDomain;
  onCheck:  (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

/**
 * Single sending-domain card. Header strip carries status (pending /
 * verified / failed), body shows DNS records when not verified, or a
 * compact confirmation when verified.
 */
export function DomainCard({ domain, onCheck, onRemove }: Props) {
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      await onCheck(domain.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Verification check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = async () => {
    if (!confirming) {
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 4000);
      return;
    }
    try {
      await onRemove(domain.id);
      toast.success(`Removed ${domain.name}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove domain');
    }
  };

  return (
    <article className={styles.card} data-status={domain.status}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <StatusIcon status={domain.status} />
          <span className={styles.name}>{domain.name}</span>
          <StatusPill status={domain.status} />
        </div>
        <div className={styles.headerActions}>
          {domain.status !== 'verified' && (
            <Button
              variant="secondary"
              size="sm"
              leading={checking ? <IconLoader2 size={14} className={styles.spinIcon} /> : <IconRefresh size={14} />}
              onClick={handleCheck}
              disabled={checking}
            >
              {checking ? 'Checking…' : 'Check now'}
            </Button>
          )}
          <Button
            variant={confirming ? 'danger' : 'ghost'}
            size="sm"
            leading={<IconTrash size={14} />}
            onClick={handleRemove}
          >
            {confirming ? 'Confirm remove?' : 'Remove'}
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        {domain.status === 'verified' ? (
          <div className={styles.verifiedNotice}>
            <Text size="sm">
              Verified {formatDate(domain.verifiedAt)} · {domain.records.length} DNS record
              {domain.records.length === 1 ? '' : 's'} active.
            </Text>
            <Text size="xs" tone="muted">
              Campaigns will send from <code>campaigns@{domain.name}</code>
            </Text>
          </div>
        ) : (
          <>
            <Text size="sm" tone="muted" className={styles.bodyIntro}>
              Add these records to your DNS provider (Cloudflare, Namecheap,
              GoDaddy, etc.). DNS changes take 5–30 minutes to propagate.
            </Text>
            <div className={styles.recordsTable}>
              <div className={styles.recordsHead}>
                <span>Type</span>
                <span>Name</span>
                <span>Value</span>
              </div>
              {domain.records.map((r, i) => (
                <DnsRecord key={i} record={r} />
              ))}
            </div>
            {domain.status === 'failed' && (
              <Text size="xs" tone="red" className={styles.failedHint}>
                Verification failed. Double-check the records above against
                what your DNS provider shows. Common gotchas: pasting
                truncated values, using the wrong record type, forgetting
                to remove the apex subdomain prefix.
              </Text>
            )}
            <Text size="xs" tone="muted" className={styles.checkedAt}>
              {domain.lastCheckedAt
                ? `Last checked ${formatRelative(domain.lastCheckedAt)}`
                : 'Not yet checked'}
            </Text>
          </>
        )}
      </div>
    </article>
  );
}

function StatusIcon({ status }: { status: SendingDomain['status'] }) {
  if (status === 'verified') return <IconCheck       size={16} className={styles.iconVerified} />;
  if (status === 'failed')   return <IconAlertCircle size={16} className={styles.iconFailed}   />;
  return                            <IconLoader2     size={16} className={`${styles.iconPending} ${styles.spinIcon}`} />;
}

function StatusPill({ status }: { status: SendingDomain['status'] }) {
  const label = status === 'verified' ? 'Verified'
              : status === 'failed'   ? 'Failed'
              : 'Pending';
  return <span className={`${styles.pill} ${styles['pill_' + status]}`}>{label}</span>;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60)   return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
