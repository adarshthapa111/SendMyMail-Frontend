import type { MouseEvent } from 'react';
import type { IconType } from 'react-icons';
import styles from '@styles/components/integrations/IntegrationsScreen.module.css';

export type CardStatus =
  | { kind: 'connected' }                  // green dot, "Connected"
  | { kind: 'coming-soon' }                // neutral pill, no button
  | { kind: 'not-supported' }              // gray pill, no button (Daraz)
  | { kind: 'available' };                 // no pill, primary action shown

export type CardVariant = 'featured' | 'standard';

interface Props {
  /** Solid brand color for the letter / icon badge background. */
  brandColor: string;
  /** Letter shown when `icon` is absent. Single character recommended. */
  letter: string;
  /** Optional brand icon (react-icons component). */
  icon?: IconType;
  name: string;
  /** Short description shown under the name on standard cards. */
  tagline: string;
  status: CardStatus;
  /**
   * "Featured" cards (top of the screen) get a bigger logo + the
   * `featuredReason` copy as the prominent body text. Standard cards
   * stay compact.
   */
  variant?: CardVariant;
  /** Editorial copy shown ONLY on featured cards (replaces tagline). */
  featuredReason?: string;
  /** Action label — "Connect" / "Configure" / "Set up" / "Export". */
  actionLabel?: string;
  /** Primary (terra-filled) vs secondary (outlined) button. */
  actionPrimary?: boolean;
  onAction?: () => void;
}

/**
 * Universal integration card. Same component used in:
 *   - Featured hero row (variant: 'featured', uses featuredReason copy)
 *   - Inbound section (variant: 'standard', status: 'coming-soon' or 'not-supported')
 *   - Outbound section (variant: 'standard', status: 'connected' or 'available')
 *
 * Status drives the pill in the top-right corner; action drives the
 * button at the bottom. Cards without an `onAction` render without a
 * button (used for inbound "coming-soon" rows).
 */
export default function PlatformCard({
  brandColor,
  letter,
  icon: Icon,
  name,
  tagline,
  status,
  variant = 'standard',
  featuredReason,
  actionLabel,
  actionPrimary,
  onAction,
}: Props) {
  const isFeatured = variant === 'featured';
  const dim        = status.kind === 'not-supported';

  /* Vercel-style spotlight: track the mouse position inside the card
     and write it to CSS custom properties (--mx / --my). The CSS uses
     these to position a radial-gradient that follows the cursor — the
     "premium SaaS card" effect. Pure CSS handles the visual; this
     handler only updates the variables. */
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (dim) return;                                // don't track on disabled cards
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      className={`${styles.card} ${isFeatured ? styles.cardFeatured : ''} ${dim ? styles.cardDim : ''}`}
      onMouseMove={onMouseMove}
      /* Expose the brand color as a CSS custom property so per-card hover
         effects (border accent, spotlight glow, lift shadow) pick up the
         platform's identity — Mailchimp yellow, Brevo green, SendGrid blue,
         etc. CSS falls back to `--color-primary` if --brand isn't set. */
      style={{ ['--brand' as string]: brandColor }}
    >
      {/* Header: logo + corner status pill */}
      <div className={styles.cardHead}>
        <div
          className={`${styles.cardLogo} ${isFeatured ? styles.cardLogoFeatured : ''}`}
          style={{ background: brandColor, color: textOn(brandColor) }}
          aria-hidden="true"
        >
          {Icon ? <Icon size={isFeatured ? 26 : 20} /> : letter}
        </div>

        {status.kind === 'connected' && (
          <span className={`${styles.pill} ${styles.pillGreen}`}>
            <span className={styles.pillDot} aria-hidden="true" />
            Connected
          </span>
        )}
        {status.kind === 'coming-soon' && (
          <span className={`${styles.pill} ${styles.pillNeutral}`}>Coming soon</span>
        )}
        {status.kind === 'not-supported' && (
          <span className={`${styles.pill} ${styles.pillGray}`}>Not supported</span>
        )}
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <div className={styles.cardName}>{name}</div>
        <div className={styles.cardTagline}>
          {isFeatured && featuredReason ? featuredReason : tagline}
        </div>
      </div>

      {/* Footer action */}
      {actionLabel && onAction && (
        <div className={styles.cardFoot}>
          <button
            type="button"
            className={`${styles.btn} ${actionPrimary ? styles.btnPrimary : ''}`}
            onClick={onAction}
          >
            {actionLabel}
            {actionPrimary && <span aria-hidden="true" style={{ marginLeft: 4 }}>→</span>}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Pick black or white text for the letter badge based on brand color
 * luminance. Avoids "Mailchimp Y on yellow" unreadability.
 */
function textOn(bg: string): string {
  const hex = bg.replace('#', '');
  if (hex.length !== 6) return '#ffffff';
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? '#2B2620' : '#ffffff';
}
