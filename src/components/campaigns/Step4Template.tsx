import { IconMail, IconCheck } from '@tabler/icons-react';
import { Text, Spinner } from '../ui';
import { useTemplates } from '../../hooks/useTemplates';
import type { Campaign, CampaignUpdateBody } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  draft: Campaign;
  onChange: (patch: Partial<CampaignUpdateBody>) => void;
  clientId: string;
}

export function Step4Template({ draft, onChange, clientId }: Props) {
  const tpls = useTemplates(clientId);

  if (tpls.status === 'loading' || tpls.status === 'idle') {
    return <div className={styles.centerSmall}><Spinner /></div>;
  }

  const visible = tpls.items.filter((t) => !t.archived);

  if (visible.length === 0) {
    return (
      <div className={styles.emptyInline}>
        <Text tone="muted">No templates yet. Build one in the Templates area, then come back.</Text>
      </div>
    );
  }

  return (
    <div className={styles.templateGrid}>
      {visible.map((tpl) => {
        const selected = draft.templateId === tpl.id;
        return (
          <button
            key={tpl.id}
            type="button"
            className={`${styles.tplCard} ${selected ? styles.tplCardSelected : ''}`}
            onClick={() => onChange({ templateId: tpl.id })}
          >
            <div className={styles.tplThumb}>
              {tpl.thumbnailUrl
                ? <img src={tpl.thumbnailUrl} alt="" />
                : <IconMail size={28} />
              }
              {selected && (
                <span className={styles.tplCheck}><IconCheck size={14} /></span>
              )}
            </div>
            <div className={styles.tplMeta}>
              <span className={styles.tplName}>{tpl.name}</span>
              {tpl.category && <span className={styles.tplCategory}>{tpl.category}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
