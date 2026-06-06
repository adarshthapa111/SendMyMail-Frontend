import { IconUsers, IconMail, IconMailForward, IconClock, IconPencil } from '@tabler/icons-react';
import { Text, Spinner } from '../ui';
import { useLists } from '../../hooks/useLists';
import { useTemplates } from '../../hooks/useTemplates';
import type { Campaign } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  draft: Campaign;
  clientId: string;
  onJump: (step: number) => void;
}

/* Step 6 — pre-launch review. Pulls list + template names from cache so
   the user sees the human-readable summary, not just IDs. Each section
   has a "Edit" link that jumps back to that step. */
export function Step6Review({ draft, clientId, onJump }: Props) {
  const lists = useLists(clientId);
  const tpls  = useTemplates(clientId);

  const list = lists.items.find((l) => l.id === draft.listId);
  const tpl  = tpls.items.find((t)  => t.id === draft.templateId);

  return (
    <div className={styles.review}>
      <ReviewRow
        icon={<IconUsers size={18} />}
        title="Recipients"
        body={list ? list.name : draft.listId ?? '—'}
        meta={list ? (list.description ?? undefined) : undefined}
        onEdit={() => onJump(2)}
      />
      <ReviewRow
        icon={<IconMailForward size={18} />}
        title="From"
        body={draft.fromName ? `${draft.fromName} <${draft.fromEmail ?? '?'}>` : (draft.fromEmail ?? '—')}
        onEdit={() => onJump(3)}
      />
      <ReviewRow
        icon={<IconMail size={18} />}
        title="Subject"
        body={draft.subject ?? '—'}
        meta={draft.preheader ?? undefined}
        onEdit={() => onJump(3)}
      />
      <ReviewRow
        icon={tpls.status === 'loading' ? <Spinner /> : <IconMail size={18} />}
        title="Template"
        body={tpl ? tpl.name : draft.templateId ?? '—'}
        meta={tpl?.category ?? undefined}
        onEdit={() => onJump(4)}
      />
      <ReviewRow
        icon={<IconClock size={18} />}
        title="Schedule"
        body="Send now"
        onEdit={() => onJump(5)}
      />

      <div className={styles.reviewNotice}>
        <Text tone="muted" size="sm">
          Click <strong>Send now</strong> to snapshot recipients and start the
          send pipeline. You'll see live progress on the report page.
        </Text>
      </div>
    </div>
  );
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  meta?: string;
  onEdit: () => void;
}

function ReviewRow({ icon, title, body, meta, onEdit }: RowProps) {
  return (
    <div className={styles.reviewRow}>
      <span className={styles.reviewIcon}>{icon}</span>
      <div className={styles.reviewMeta}>
        <span className={styles.reviewTitle}>{title}</span>
        <span className={styles.reviewBody}>{body}</span>
        {meta && <span className={styles.reviewSubtle}>{meta}</span>}
      </div>
      <button type="button" className={styles.reviewEdit} onClick={onEdit}>
        <IconPencil size={12} />
        Edit
      </button>
    </div>
  );
}
