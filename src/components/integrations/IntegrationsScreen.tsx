import { useEffect, useMemo, useState } from 'react';
import { IconArrowBounce, IconSparkles } from '@tabler/icons-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { hydrateConnections } from '../../store/slices/integrationsSlice';
import { platformRegistry, isV1, isFeatured, type PlatformDef } from '../../integrations/registry';
import { INBOUND_CATALOG } from '../../integrations/inboundCatalog';
import { loadAllConnections } from '../../integrations/credentials';
import { Heading, Text } from '../ui';
import PlatformCard, { type CardStatus } from './PlatformCard';
import ConnectModal from './ConnectModal';
import WebhookModal from './WebhookModal';
import SetupModal from './SetupModal';
import styles from '@styles/components/integrations/IntegrationsScreen.module.css';

/* Vercel-style featured + grid layout. */
export default function IntegrationsScreen() {
  const dispatch    = useAppDispatch();
  const connections = useAppSelector((s) => s.integrations.connections);

  const [openPlatform, setOpenPlatform] = useState<PlatformDef | null>(null);

  useEffect(() => {
    dispatch(hydrateConnections(loadAllConnections()));
  }, [dispatch]);

  const allOutbound = useMemo(() => {
    const order = ['mailchimp', 'mailerlite', 'brevo', 'sendgrid', 'hubspot', 'klaviyo'];
    return order
      .map((id) => platformRegistry[id])
      .filter((def): def is PlatformDef => Boolean(def) && isV1(def) && def.tier !== 4);
  }, []);

  const featured = useMemo(() => allOutbound.filter(isFeatured), [allOutbound]);
  const others   = useMemo(() => allOutbound.filter((d) => !isFeatured(d)), [allOutbound]);

  const escapeHatches = useMemo(() => {
    const ids = ['html', 'mjml', 'webhook'];
    return ids
      .map((id) => platformRegistry[id])
      .filter((def): def is PlatformDef => Boolean(def));
  }, []);

  const renderModal = () => {
    if (!openPlatform) return null;
    const close = () => setOpenPlatform(null);
    if (openPlatform.tier === 1) return <ConnectModal def={openPlatform} onClose={close} />;
    if (openPlatform.tier === 4) return <WebhookModal def={openPlatform} onClose={close} />;
    return <SetupModal def={openPlatform} onClose={close} />;
  };

  const outboundCardProps = (def: PlatformDef, variant: 'featured' | 'standard') => {
    const isConnected = connections[def.id]?.status === 'connected';
    const status: CardStatus = isConnected ? { kind: 'connected' } : { kind: 'available' };

    let actionLabel: string;
    let actionPrimary = false;

    if (def.tier === 1) {
      actionLabel   = isConnected ? 'Configure' : 'Connect';
      actionPrimary = !isConnected;
    } else {
      actionLabel   = 'Export';
    }

    return {
      brandColor:     def.brandColor,
      letter:         def.name.charAt(0),
      icon:           def.icon,
      name:           def.name,
      tagline:        def.description,
      status,
      variant,
      featuredReason: def.featured?.reason,
      actionLabel,
      actionPrimary,
      onAction:       () => setOpenPlatform(def),
    };
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <Heading size="xl">Integrations</Heading>
        <Text tone="muted" className={styles.subtitle}>
          Sync e-commerce data in, and export your built email out to the
          platform you use
        </Text>
      </header>

      {/* ── Featured ───────────────────────────────────────────── */}
      {featured.length > 0 && (
        <>
          <div className={styles.sectionLabel}>
            <IconSparkles size={14} className={styles.sectionIcon} />
            Recommended for your market
          </div>
          <div className={styles.featuredGrid}>
            {featured.map((def) => (
              <PlatformCard key={def.id} {...outboundCardProps(def, 'featured')} />
            ))}
          </div>
        </>
      )}

      {/* ── E-commerce sync (inbound) ──────────────────────────── */}
      <div className={styles.sectionLabel}>E-commerce sync (inbound)</div>
      <div className={styles.inboundGrid}>
        {INBOUND_CATALOG.map((entry) => (
          <PlatformCard
            key={entry.id}
            brandColor={entry.brandColor}
            letter={entry.letter}
            icon={entry.icon}
            name={entry.name}
            tagline={entry.tagline}
            status={{ kind: entry.status }}
            variant="standard"
          />
        ))}
      </div>

      {/* ── More email platforms ───────────────────────────────── */}
      {others.length > 0 && (
        <>
          <div className={styles.sectionLabel}>More email platforms</div>
          <div className={styles.outboundGrid}>
            {others.map((def) => (
              <PlatformCard key={def.id} {...outboundCardProps(def, 'standard')} />
            ))}
          </div>
        </>
      )}

      {/* ── Escape-hatch note ──────────────────────────────────── */}
      <div className={styles.note}>
        <IconArrowBounce size={16} className={styles.noteIcon} />
        <div className={styles.noteBody}>
          <b>Need another platform?</b> Export raw{' '}
          {escapeHatches.map((def, i) => (
            <span key={def.id}>
              <button
                type="button"
                className={styles.noteLink}
                onClick={() => setOpenPlatform(def)}
              >
                {def.id === 'webhook' ? 'webhook' : def.name.replace(' code', '')}
              </button>
              {i < escapeHatches.length - 1 ? (i === escapeHatches.length - 2 ? ' or POST to a ' : ' / ') : ''}
            </span>
          ))}
          {' '}to reach any other tool — no integration required.
        </div>
      </div>

      {renderModal()}
    </div>
  );
}
