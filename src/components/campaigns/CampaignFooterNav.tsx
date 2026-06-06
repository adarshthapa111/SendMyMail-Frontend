import { IconArrowRight, IconSend } from '@tabler/icons-react';
import { Button } from '../ui';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  step: number;
  totalSteps: number;
  saving: boolean;
  launching: boolean;
  onBack: () => void;
  onSaveDraft: () => void;
  onContinue: () => void;
  onLaunch: () => void;
}

export function CampaignFooterNav({
  step, totalSteps, saving, launching, onBack, onSaveDraft, onContinue, onLaunch,
}: Props) {
  const isLast = step === totalSteps;
  const busy   = saving || launching;

  return (
    <div className={styles.footer}>
      <div className={styles.footerLeft}>
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
      </div>
      <div className={styles.footerRight}>
        <Button variant="secondary" onClick={onSaveDraft} disabled={busy}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        {isLast ? (
          <Button
            variant="primary"
            onClick={onLaunch}
            disabled={busy}
            leading={<IconSend size={14} />}
          >
            {launching ? 'Sending…' : 'Send now'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onContinue}
            disabled={busy}
            trailing={<IconArrowRight size={14} />}
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
