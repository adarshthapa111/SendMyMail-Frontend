import { Field, Input, Text } from '../ui';
import { IconInfoCircle } from '@tabler/icons-react';
import type { Campaign, CampaignUpdateBody } from '../../lib/api/campaigns';
import styles from '@styles/components/campaigns/CampaignWizard.module.scss';

interface Props {
  draft: Campaign;
  onChange: (patch: Partial<CampaignUpdateBody>) => void;
}

/* Step 3 — envelope metadata. From name + email become the visible
   sender; subject is the inbox subject line; preheader is the optional
   preview text after the subject in most clients. */
export function Step3FromSubject({ draft, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Sender name" helper="Shown in the recipient's inbox as the From.">
        <Input
          type="text"
          value={draft.fromName ?? ''}
          onChange={(e) => onChange({ fromName: e.target.value || null })}
          placeholder="e.g. Bose Sound"
          maxLength={100}
        />
      </Field>

      <Field
        label="Sender email"
        helper="Without a verified domain, Resend only delivers to your signup email."
      >
        <Input
          type="email"
          value={draft.fromEmail ?? ''}
          onChange={(e) => onChange({ fromEmail: e.target.value || null })}
          placeholder="hello@yourdomain.com"
        />
      </Field>

      <Field label="Subject" helper="What recipients see in their inbox.">
        <Input
          type="text"
          value={draft.subject ?? ''}
          onChange={(e) => onChange({ subject: e.target.value || null })}
          placeholder="e.g. Spring savings — 20% off this week"
          maxLength={200}
        />
      </Field>

      <Field
        label="Preheader"
        hint="(optional)"
        helper="Preview text after the subject in most inboxes."
      >
        <Input
          type="text"
          value={draft.preheader ?? ''}
          onChange={(e) => onChange({ preheader: e.target.value || null })}
          placeholder="e.g. Limited time, our biggest deals of the season."
          maxLength={150}
        />
      </Field>

      <div className={styles.notice}>
        <IconInfoCircle size={14} className={styles.noticeIcon} />
        <Text size="xs" tone="muted" className={styles.noticeText}>
          Subject line cannot contain merge tags (V1). Recipient body
          supports <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>, and{' '}
          <code>{'{{email}}'}</code>.
        </Text>
      </div>
    </div>
  );
}
