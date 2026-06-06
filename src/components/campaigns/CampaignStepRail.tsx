import { IconCheck } from '@tabler/icons-react';
import type { Campaign } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignStepRail.module.scss';

interface Props {
  current: number;
  draft: Campaign;
  onJump: (step: number) => void;
}

interface StepDef {
  n: number;
  title: string;
  subtitle: string;
  complete: (d: Campaign) => boolean;
}

const STEPS: StepDef[] = [
  { n: 1, title: 'Name',           subtitle: 'Internal label',  complete: (d) => Boolean(d.name?.trim()) },
  { n: 2, title: 'Recipients',     subtitle: 'Who gets it',     complete: (d) => Boolean(d.listId) },
  { n: 3, title: 'From & subject', subtitle: 'Sender info',     complete: (d) => Boolean(d.fromName && d.fromEmail && d.subject) },
  { n: 4, title: 'Template',       subtitle: 'Choose design',   complete: (d) => Boolean(d.templateId) },
  { n: 5, title: 'Schedule',       subtitle: 'Send now',        complete: () => true },
  { n: 6, title: 'Review & send',  subtitle: 'Final check',     complete: () => false },
];

export function CampaignStepRail({ current, draft, onJump }: Props) {
  return (
    <aside className={styles.rail}>
      {STEPS.map((s) => {
        const done   = s.complete(draft);
        const active = s.n === current;
        const clickable = s.n < current || done;        // can jump backward freely, forward only if complete
        return (
          <button
            key={s.n}
            type="button"
            className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}
            onClick={() => { if (clickable) onJump(s.n); }}
            disabled={!clickable}
            aria-current={active ? 'step' : undefined}
          >
            <span className={styles.num}>
              {done && !active ? <IconCheck size={13} /> : s.n}
            </span>
            <span className={styles.text}>
              <span className={styles.title}>{s.title}</span>
              <span className={styles.subtitle}>{s.subtitle}</span>
            </span>
          </button>
        );
      })}
    </aside>
  );
}
