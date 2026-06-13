import { useState } from 'react';
import { Card, Heading, Text, Field, Input, Textarea, Button } from '../ui';
import { IconSparkles } from '@tabler/icons-react';
import ColorPicker from '../inspector/controls/ColorPicker';
import FontPicker from '../inspector/controls/FontPicker';
import { updateClient, type Client } from '../../lib/api/clients';
import { withFormToast } from '../../lib/toast';
import styles from '@styles/components/clients/BrandKitCard.module.scss';

/* feature-client-brand-kit V1 — per-client brand editor on the client
   page. Set it once; the email editor's section composites then drop
   on-brand (header logo/name, CTA/button colors, footer address).
   Saves independently of the basic name/domain form above it. */

interface Props {
  client: Client;
  onSaved: (client: Client) => void;
}

const DEFAULT_PRIMARY = '#111827';
const DEFAULT_FONT = 'Helvetica, Arial, sans-serif';

export function BrandKitCard({ client, onSaved }: Props) {
  const [primary, setPrimary]   = useState(client.brandPrimary ?? DEFAULT_PRIMARY);
  const [font, setFont]         = useState(client.brandFont ?? DEFAULT_FONT);
  const [logoUrl, setLogoUrl]   = useState(client.brandLogoUrl ?? '');
  const [address, setAddress]   = useState(client.brandAddress ?? '');
  const [facebook, setFacebook]   = useState(client.brandSocial?.facebook ?? '');
  const [instagram, setInstagram] = useState(client.brandSocial?.instagram ?? '');
  const [twitter, setTwitter]     = useState(client.brandSocial?.twitter ?? '');
  const [saving, setSaving] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const norm = (s: string) => s.trim() || null;
  const socialPayload = () => {
    const o: Record<string, string> = {};
    if (facebook.trim())  o.facebook  = facebook.trim();
    if (instagram.trim()) o.instagram = instagram.trim();
    if (twitter.trim())   o.twitter   = twitter.trim();
    return Object.keys(o).length ? o : null;
  };

  const dirty =
    (client.brandPrimary ?? DEFAULT_PRIMARY) !== primary ||
    (client.brandFont ?? DEFAULT_FONT) !== font ||
    (client.brandLogoUrl ?? '') !== logoUrl.trim() ||
    (client.brandAddress ?? '') !== address.trim() ||
    (client.brandSocial?.facebook ?? '') !== facebook.trim() ||
    (client.brandSocial?.instagram ?? '') !== instagram.trim() ||
    (client.brandSocial?.twitter ?? '') !== twitter.trim();

  async function onSave() {
    setSaving(true);
    try {
      const res = await withFormToast(
        updateClient(client.id, {
          brandPrimary: primary,
          brandFont:    font,
          brandLogoUrl: norm(logoUrl),
          brandAddress: norm(address),
          brandSocial:  socialPayload(),
        }),
        { loading: 'Saving brand kit…', success: `Brand kit saved for ${client.name}` },
      );
      onSaved(res.data.client);
    } catch { /* toast shown */ }
    finally { setSaving(false); }
  }

  return (
    <Card padding="lg">
      <div className={styles.head}>
        <span className={styles.headIcon} aria-hidden="true"><IconSparkles size={16} /></span>
        <div>
          <Heading size="md">Brand kit</Heading>
          <Text tone="muted" className={styles.sub}>
            Sets the look of every section you drop into {client.name}'s emails — logo, colors, font, footer.
          </Text>
        </div>
      </div>

      <div className={styles.grid}>
        <Field label="Primary color" helper="CTA buttons, banners, accents.">
          <ColorPicker value={primary} onCommit={setPrimary} />
        </Field>

        <Field label="Font">
          <FontPicker value={font} onCommit={setFont} />
        </Field>
      </div>

      <Field label="Logo URL" helper="Shown in headers + footers. Leave blank to use a “✦ name” wordmark.">
        <Input
          value={logoUrl}
          onChange={(e) => { setLogoUrl(e.target.value); setLogoBroken(false); }}
          placeholder="https://…/logo.png"
          maxLength={2000}
        />
      </Field>
      {logoUrl.trim() && !logoBroken ? (
        <div className={styles.logoPreview}>
          <img src={logoUrl.trim()} alt="Logo preview" onError={() => setLogoBroken(true)} />
        </div>
      ) : null}

      <Field label="Footer address" helper="Postal address for the footer (CAN-SPAM / anti-spam compliance).">
        <Textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Thamel, Kathmandu, Nepal"
          rows={2}
          maxLength={500}
        />
      </Field>

      <div className={styles.grid3}>
        <Field label="Facebook">
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/…" maxLength={2000} />
        </Field>
        <Field label="Instagram">
          <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/…" maxLength={2000} />
        </Field>
        <Field label="X / Twitter">
          <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/…" maxLength={2000} />
        </Field>
      </div>

      <div className={styles.foot}>
        <Button variant="primary" onClick={onSave} loading={saving} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save brand kit'}
        </Button>
      </div>
    </Card>
  );
}
