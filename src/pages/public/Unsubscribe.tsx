import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IconCheck, IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { confirmUnsubscribe, type UnsubResponse } from '../../lib/api/unsubscribe';
import styles from '@styles/components/public/Unsubscribe.module.scss';

/* /u/:token — PUBLIC unsubscribe confirmation page.
   ──────────────────────────────────────────────────
   Outside AppShell, no auth, no agency context. Recipient receives a
   campaign, clicks the footer link, lands here. We hit the backend
   confirm endpoint which validates the HMAC token and updates the
   suppression list, then renders one of three states:
     - SUCCESS         "You've been unsubscribed"
     - ALREADY         "You're already unsubscribed"
     - INVALID         "Link is invalid or expired"

   Always renders a result (the backend always returns 200 — never 4xx —
   so email-link scanners don't flag the URL as broken). */
export function Unsubscribe() {
  const { unsubToken } = useParams<{ unsubToken: string }>();
  const [state, setState] = useState<'loading' | UnsubResponse>('loading');

  useEffect(() => {
    if (!unsubToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ ok: false, code: 'invalid_token' });
      return;
    }
    let cancelled = false;
    confirmUnsubscribe(unsubToken)
      .then((res) => { if (!cancelled) setState(res.data); })
      .catch(() => { if (!cancelled) setState({ ok: false, code: 'invalid_token' }); });
    return () => { cancelled = true; };
  }, [unsubToken]);

  return (
    /* Public page — always renders default theme. Recipient hasn't
       picked an app theme (they're external to the agency's app). */
    <div data-theme="default" className={styles.page}>
      <div className={styles.card}>
        {state === 'loading' ? (
          <LoadingState />
        ) : state.ok && state.alreadyUnsubscribed ? (
          <AlreadyState email={state.email} agencyName={state.agencyName} />
        ) : state.ok ? (
          <SuccessState email={state.email} agencyName={state.agencyName} />
        ) : (
          <InvalidState />
        )}
      </div>

      <p className={styles.footerLine}>
        Powered by <strong>SendMyMail</strong>
      </p>
    </div>
  );
}

/* ─── States ─────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <>
      <div className={`${styles.icon} ${styles.iconLoading}`} aria-hidden="true">
        <IconLoader2 size={28} />
      </div>
      <h1 className={styles.title}>Unsubscribing…</h1>
      <p className={styles.body}>Just a moment.</p>
    </>
  );
}

function SuccessState({ email, agencyName }: { email: string; agencyName: string }) {
  return (
    <>
      <div className={`${styles.icon} ${styles.iconSuccess}`} aria-hidden="true">
        <IconCheck size={28} />
      </div>
      <h1 className={styles.title}>Unsubscribed</h1>
      <p className={styles.body}>
        We've removed <strong>{email}</strong> from this list. You won't
        receive any more emails from <strong>{agencyName}</strong> through
        this list.
      </p>
      <p className={styles.bodyMuted}>
        Wrong email? Just close this page.
      </p>
    </>
  );
}

function AlreadyState({ email, agencyName }: { email: string; agencyName: string }) {
  return (
    <>
      <div className={`${styles.icon} ${styles.iconSuccess}`} aria-hidden="true">
        <IconCheck size={28} />
      </div>
      <h1 className={styles.title}>You're already unsubscribed</h1>
      <p className={styles.body}>
        <strong>{email}</strong> is already on the do-not-mail list for{' '}
        <strong>{agencyName}</strong>. No action needed.
      </p>
    </>
  );
}

function InvalidState() {
  return (
    <>
      <div className={`${styles.icon} ${styles.iconError}`} aria-hidden="true">
        <IconAlertCircle size={28} />
      </div>
      <h1 className={styles.title}>This link doesn't work</h1>
      <p className={styles.body}>
        The link may have been copied incorrectly, or the email you
        received doesn't have a valid unsubscribe token.
      </p>
      <p className={styles.bodyMuted}>
        If you keep receiving emails you don't want, contact the sender
        directly to be removed from their list.
      </p>
    </>
  );
}
