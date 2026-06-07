import { Link } from 'react-router-dom';
import { IconArrowRight, IconX } from '@tabler/icons-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import styles from '@styles/components/onboarding/OnboardingBanner.module.scss';

/**
 * Persistent reminder shown on the dashboard for users who haven't
 * completed onboarding yet (and haven't explicitly skipped). Hides
 * itself when:
 *   - Onboarding hasn't loaded yet (no flash on first paint)
 *   - User has all 3 steps done (allDone)
 *   - User clicked "Skip onboarding" (setupComplete: true)
 *
 * "Dismiss" on the banner = soft-skip (silently flip setupComplete).
 * Same backend effect as the skip button on /onboarding.
 */
export function OnboardingBanner() {
  const { data, skip } = useOnboarding();

  if (!data) return null;
  if (data.setupComplete) return null;
  if (data.allDone) return null;

  const completed = data.steps.filter((s) => s.done).length;
  const total     = data.steps.length;

  return (
    <div className={styles.banner} role="status">
      <div className={styles.left}>
        <div className={styles.progress} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{ width: `${(completed / total) * 100}%` }}
          />
        </div>
        <div className={styles.text}>
          <strong className={styles.title}>Finish setting up</strong>
          <span className={styles.sub}>
            {completed} of {total} steps complete · {nextStepLabel(data.steps)}
          </span>
        </div>
      </div>
      <div className={styles.actions}>
        <Link to="/onboarding" className={styles.cta}>
          Continue setup
          <IconArrowRight size={14} />
        </Link>
        <button
          type="button"
          className={styles.dismiss}
          onClick={() => { void skip(); }}
          aria-label="Dismiss"
          title="Skip onboarding"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}

function nextStepLabel(steps: Array<{ done: boolean; title: string }>): string {
  const next = steps.find((s) => !s.done);
  return next ? `next: ${next.title}` : 'all done';
}
