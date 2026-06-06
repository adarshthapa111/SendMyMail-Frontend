import { Field, Input, Text } from '../ui';
import type { Campaign, CampaignUpdateBody } from '../../lib/api/campaigns';

interface Props {
  draft: Campaign;
  onChange: (patch: Partial<CampaignUpdateBody>) => void;
}

export function Step1Name({ draft, onChange }: Props) {
  return (
    <div className="space-y-4">
      <Field label="Campaign name" helper="Internal label only — recipients won't see this.">
        <Input
          type="text"
          value={draft.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Spring promo · launch week"
          maxLength={200}
          autoFocus
        />
      </Field>
      <Text tone="muted" size="xs">
        Tip: name it after the goal (campaign / audience / timing) so it's
        easy to find in reports later.
      </Text>
    </div>
  );
}
