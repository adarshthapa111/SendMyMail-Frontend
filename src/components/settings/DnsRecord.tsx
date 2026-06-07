import { useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import type { DnsRecord as DnsRecordT } from '../../lib/api/sendingDomains';
import styles from '@styles/components/settings/DnsRecord.module.scss';

interface Props {
  record: DnsRecordT;
}

/**
 * One row in the DNS records table. Shows TYPE / NAME / VALUE with
 * copy buttons on each. Per-record status pill if Resend reports
 * one (pending / verified per-record).
 */
export function DnsRecord({ record }: Props) {
  return (
    <div className={styles.row}>
      <div className={styles.cellType}>{record.record || record.type}</div>
      <CopyCell value={record.name}  label="Name"  multiline={false} />
      <CopyCell value={record.value} label="Value" multiline={true} />
      {record.priority !== undefined && (
        <div className={styles.cellPriority} title="Priority (MX only)">
          Pri {record.priority}
        </div>
      )}
      {record.status && (
        <span className={`${styles.recordStatus} ${styles['recordStatus_' + (record.status === 'verified' ? 'verified' : 'pending')]}`}>
          {record.status === 'verified' ? '✓' : '⏳'}
        </span>
      )}
    </div>
  );
}

function CopyCell({ value, label, multiline }: { value: string; label: string; multiline: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Silent — user can manually select + copy
    }
  };
  return (
    <div className={`${styles.cellValue} ${multiline ? styles.cellValueMulti : ''}`}>
      <code className={styles.code} title={value}>{value}</code>
      <button
        type="button"
        className={styles.copyBtn}
        onClick={onCopy}
        aria-label={`Copy ${label}`}
        title={copied ? 'Copied!' : `Copy ${label}`}
      >
        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
      </button>
    </div>
  );
}
