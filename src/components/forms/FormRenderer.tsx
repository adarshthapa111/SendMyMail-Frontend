import { useState, type FormEvent } from 'react';
import { IconMail, IconCheck } from '@tabler/icons-react';
import styles from '@styles/components/forms/FormRenderer.module.scss';

/**
 * The actual signup form UI — shared between:
 *   - FormEditor's side-by-side preview pane (interactive: false)
 *   - Public /f/:slug page (interactive: true; calls onSubmit)
 *
 * One source of truth for what the form looks like and behaves like.
 * Theming via the `brandColor` prop sets a CSS custom property on the
 * card root that drives button background + accent colors.
 */

export interface FormRendererConfig {
  agencyName:       string;
  name:             string;
  headline:         string | null;
  subheadline:      string | null;
  buttonText:       string;
  thankYouMessage:  string;
  collectFirstName: boolean;
  collectLastName:  boolean;
  brandColor:       string | null;
  requireConsent:   boolean;
  consentText:      string | null;
}

interface Props {
  config: FormRendererConfig;
  /** When true, the form actually submits via onSubmit. When false
   *  (preview mode), submission is no-op and the thank-you state is
   *  only shown if explicitly toggled. */
  interactive?: boolean;
  /** Called with form values when interactive=true and user submits. */
  onSubmit?: (values: { email: string; first_name?: string; last_name?: string; consent?: boolean; honeypot?: string }) => Promise<{ ok: boolean; message?: string }>;
  /** Preview-mode flag to show the thank-you state instead of the form. */
  forceThankYou?: boolean;
  /** Used by the public page to render "form unavailable" without
   *  reloading. Treated as a non-interactive thank-you-like state. */
  unavailable?: { title: string; body: string };
}

export function FormRenderer({ config, interactive = false, onSubmit, forceThankYou = false, unavailable }: Props) {
  const [email,       setEmail]     = useState('');
  const [firstName,   setFirstName] = useState('');
  const [lastName,    setLastName]  = useState('');
  const [consent,     setConsent]   = useState(false);
  const [honeypot,    setHoneypot]  = useState('');
  const [submitting,  setSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [error,       setError]     = useState<string | null>(null);

  const brandStyle = config.brandColor
    ? { ['--form-brand' as string]: config.brandColor }
    : undefined;

  const isThankYou = forceThankYou || showThankYou;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!interactive || !onSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit({
        email,
        first_name: firstName.trim() || undefined,
        last_name:  lastName.trim() || undefined,
        consent:    config.requireConsent ? consent : undefined,
        honeypot:   honeypot.trim() || undefined,
      });
      if (result.ok) {
        setShowThankYou(true);
      } else {
        setError(result.message ?? 'Something went wrong.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  if (unavailable) {
    return (
      <div className={styles.card}>
        <div className={styles.iconBadge}><IconMail size={28} /></div>
        <h1 className={styles.title}>{unavailable.title}</h1>
        <p className={styles.body}>{unavailable.body}</p>
        <p className={styles.footerLine}>
          Powered by <strong>SendMyMail</strong>
        </p>
      </div>
    );
  }

  if (isThankYou) {
    return (
      <div className={styles.card} style={brandStyle}>
        <div className={`${styles.iconBadge} ${styles.iconBadgeSuccess}`}><IconCheck size={28} /></div>
        <h1 className={styles.title}>{config.thankYouMessage}</h1>
        <p className={styles.footerLine}>
          Powered by <strong>SendMyMail</strong>
        </p>
      </div>
    );
  }

  return (
    <form className={styles.card} style={brandStyle} onSubmit={handleSubmit}>
      <div className={styles.eyebrow}>{config.agencyName}</div>

      {config.headline && (
        <h1 className={styles.title}>{config.headline}</h1>
      )}
      {config.subheadline && (
        <p className={styles.body}>{config.subheadline}</p>
      )}

      <div className={styles.fields}>
        {config.collectFirstName && (
          <input
            type="text"
            className={styles.input}
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!interactive || submitting}
            maxLength={100}
          />
        )}
        {config.collectLastName && (
          <input
            type="text"
            className={styles.input}
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={!interactive || submitting}
            maxLength={100}
          />
        )}
        <input
          type="email"
          className={styles.input}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!interactive || submitting}
          required={interactive}
          autoComplete="email"
        />

        {/* Honeypot — hidden field. Real users never see it; bots fill it. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          aria-hidden="true"
          className={styles.honeypot}
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          autoComplete="off"
        />
      </div>

      {config.requireConsent && (
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            disabled={!interactive || submitting}
            className={styles.consentInput}
          />
          <span className={styles.consentText}>{config.consentText || 'I agree to receive emails.'}</span>
        </label>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!interactive || submitting}
      >
        {submitting ? 'Submitting…' : config.buttonText}
      </button>

      <p className={styles.footerLine}>
        Powered by <strong>SendMyMail</strong>
      </p>
    </form>
  );
}
