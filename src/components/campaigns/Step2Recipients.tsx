import { IconUsers, IconCheck } from '@tabler/icons-react';
import { Text, Spinner } from '../ui';
import { useLists } from '../../hooks/useLists';
import type { Campaign, CampaignUpdateBody } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  draft: Campaign;
  onChange: (patch: Partial<CampaignUpdateBody>) => void;
  clientId: string;
}

/* Step 2 — pick the recipient list. V1: single list only. Multi-list +
   exclusions land in V2. */
export function Step2Recipients({ draft, onChange, clientId }: Props) {
  const lists = useLists(clientId);

  if (lists.status === 'loading' || lists.status === 'idle') {
    return <div className={styles.centerSmall}><Spinner /></div>;
  }

  const visible = lists.items.filter((l) => !l.archived);

  if (visible.length === 0) {
    return (
      <div className={styles.emptyInline}>
        <Text tone="muted">No lists yet. Create one in the Contacts area, then come back.</Text>
      </div>
    );
  }

  return (
    <div className={styles.listPicker}>
      {visible.map((list) => {
        const selected = draft.listId === list.id;
        return (
          <button
            key={list.id}
            type="button"
            className={`${styles.pickRow} ${selected ? styles.pickRowSelected : ''}`}
            onClick={() => onChange({ listId: list.id })}
          >
            <span className={styles.pickIcon}>
              <IconUsers size={18} />
            </span>
            <span className={styles.pickMeta}>
              <span className={styles.pickName}>{list.name}</span>
              <span className={styles.pickDesc}>
                {list.description ?? 'No description'}
              </span>
            </span>
            {selected && (
              <span className={styles.pickCheck}><IconCheck size={16} /></span>
            )}
          </button>
        );
      })}
    </div>
  );
}
