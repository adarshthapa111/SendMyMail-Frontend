import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconCheck, IconArrowRight, IconUsers, IconAddressBook, IconMail,
  IconSparkles, IconLogout,
} from '@tabler/icons-react';
import { Heading, Text, Button, Spinner } from '../../components/ui';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../hooks/useAuth';
import { useClients } from '../../hooks/useClients';
import { toast } from '../../lib/toast';
import { ApiError } from '../../lib/api/client';
import styles from '@styles/components/setup/Onboarding.module.scss';

/* /onboarding — guided first-run experience.
   ─────────────────────────────────────────
   Three steps that map to existing surfaces:
     1. Create your first client      → /clients/new
     2. Add contacts                  → /clients/:cid/contacts/import (or /lists)
     3. Design your first template    → /clients/:cid/templates → New
   Backend derives progress from existing counts (no new table V1).

   The page sits OUTSIDE AppShell — full-viewport focused experience,
   no sidebar / topbar distractions. */
export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, skip, complete } = useOnboarding();
  const clients = useClients();

  /* For steps 2 + 3 we need a clientId. Use the first client they
     created during step 1; if multiple, pick the most recent. */
  const firstClient = useMemo(() => {
    const active = clients.items.filter((c) => c.status !== 'archived');
    if (active.length === 0) return null;
    return active.reduce((a, b) =>
      new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b,
    );
  }, [clients.items]);

  const handleSkip = async () => {
    try {
      await skip();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to skip');
    }
  };

  const handleComplete = async () => {
    try {
      await complete();
      toast.success('You\'re all set ✨');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to finalize');
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.loading}>
        <Text tone="muted">Couldn't load onboarding: {error ?? 'unknown'}</Text>
      </div>
    );
  }

  /* Index of the first incomplete step — drives the focused right-side
     CTA card. If all three are done, show the celebration state. */
  const activeIdx = data.steps.findIndex((s) => !s.done);
  const allDone   = data.allDone;

  return (
    <div className={styles.shell}>
      {/* ── LEFT RAIL ───────────────────────────────────────────── */}
      <aside className={styles.rail}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>S</span>
          <span className={styles.logoWord}>SendMyMail</span>
        </div>

        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          Setup
        </div>

        <div className={styles.steps}>
          {data.steps.map((step, i) => (
            <RailStep
              key={step.id}
              n={i + 1}
              title={step.title}
              done={step.done}
              active={!allDone && i === activeIdx}
              subtitle={subtitleFor(step.id, step.done, firstClient?.name)}
            />
          ))}
        </div>

        <div className={styles.railFoot}>
          {!data.setupComplete && (
            <button type="button" className={styles.skipBtn} onClick={handleSkip}>
              <IconLogout size={13} /> Skip onboarding
            </button>
          )}
          <div className={styles.foothelp}>
            Signed in as <strong>{user?.email}</strong>
          </div>
        </div>
      </aside>

      {/* ── RIGHT CONTENT ───────────────────────────────────────── */}
      <main className={styles.main}>
        {allDone ? (
          <DoneCard onFinish={handleComplete} />
        ) : (
          <ActiveStepCard
            stepId={data.steps[activeIdx].id}
            firstClientId={firstClient?.id ?? null}
            onSkip={handleSkip}
            navigate={navigate}
          />
        )}
      </main>
    </div>
  );
}

/* ─── Rail step ───────────────────────────────────────────────────── */

interface RailStepProps {
  n: number;
  title: string;
  subtitle?: string;
  done: boolean;
  active: boolean;
}

function RailStep({ n, title, subtitle, done, active }: RailStepProps) {
  return (
    <div
      className={`${styles.step} ${done ? styles.stepDone : ''} ${active ? styles.stepActive : ''}`}
      aria-current={active ? 'step' : undefined}
    >
      <span className={styles.stepNum}>
        {done ? <IconCheck size={14} /> : n}
      </span>
      <span className={styles.stepText}>
        <span className={styles.stepTitle}>{title}</span>
        {subtitle && <span className={styles.stepSub}>{subtitle}</span>}
      </span>
    </div>
  );
}

function subtitleFor(id: string, done: boolean, firstClientName?: string | null): string | undefined {
  if (id === 'client'   && done && firstClientName) return firstClientName;
  if (id === 'client'   && !done) return 'The brand you\'ll be mailing for';
  if (id === 'contacts' && done) return 'You have subscribers';
  if (id === 'contacts' && !done) return 'CSV import or paste';
  if (id === 'template' && done) return 'Ready to send';
  if (id === 'template' && !done) return 'Pick a starter or build fresh';
  return undefined;
}

/* ─── Active step focus card ─────────────────────────────────────── */

interface ActiveStepCardProps {
  stepId:        'client' | 'contacts' | 'template';
  firstClientId: string | null;
  onSkip:        () => void;
  navigate:      ReturnType<typeof useNavigate>;
}

function ActiveStepCard({ stepId, firstClientId, onSkip, navigate }: ActiveStepCardProps) {
  const content = stepContentFor(stepId, firstClientId);

  return (
    <div className={styles.card}>
      <div className={styles.cardIcon} aria-hidden="true">
        {content.icon}
      </div>

      <Heading size="xl" className={styles.cardTitle}>{content.title}</Heading>
      <Text tone="muted" className={styles.cardSub}>{content.subtitle}</Text>

      <ul className={styles.cardBullets}>
        {content.bullets.map((b, i) => (
          <li key={i} className={styles.cardBullet}>
            <IconCheck size={14} className={styles.bulletCheck} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className={styles.cardActions}>
        <Button
          variant="primary"
          size="lg"
          trailing={<IconArrowRight size={16} />}
          onClick={() => navigate(content.cta.href)}
          disabled={content.cta.disabled}
        >
          {content.cta.label}
        </Button>
        <button type="button" className={styles.cardSkipBtn} onClick={onSkip}>
          Skip for now
        </button>
      </div>

      {content.hint && (
        <Text tone="muted" size="xs" className={styles.cardHint}>
          {content.hint}
        </Text>
      )}
    </div>
  );
}

interface StepContent {
  icon:     React.ReactNode;
  title:    string;
  subtitle: string;
  bullets:  string[];
  cta:      { label: string; href: string; disabled?: boolean };
  hint?:    string;
}

function stepContentFor(stepId: 'client' | 'contacts' | 'template', firstClientId: string | null): StepContent {
  switch (stepId) {
    case 'client':
      return {
        icon: <IconUsers size={36} />,
        title: 'Create your first client',
        subtitle: 'Clients are the brands you mail for. Each client has its own contacts, lists, and templates.',
        bullets: [
          'Name the brand (e.g. "Khukri Spices")',
          'Pick a colour theme for their emails',
          'Add billing info later — not required now',
        ],
        cta: { label: 'Create client', href: '/clients/new' },
      };
    case 'contacts':
      if (!firstClientId) {
        return {
          icon: <IconAddressBook size={36} />,
          title: 'Add your contacts',
          subtitle: 'You\'ll need to create a client first before adding contacts.',
          bullets: [],
          cta: { label: 'Go back to step 1', href: '/onboarding', disabled: true },
        };
      }
      return {
        icon: <IconAddressBook size={36} />,
        title: 'Add your contacts',
        subtitle: 'Bring in the people you\'ll be mailing. We support CSV imports and direct paste.',
        bullets: [
          'Upload a CSV — we auto-detect columns',
          'Or paste a list of emails to start fast',
          'Group contacts into lists for targeted sends',
        ],
        cta: { label: 'Import contacts', href: `/clients/${firstClientId}/contacts/import` },
        hint: 'No subscribers yet? You can come back to this step later.',
      };
    case 'template':
      if (!firstClientId) {
        return {
          icon: <IconMail size={36} />,
          title: 'Design your first template',
          subtitle: 'You\'ll need a client to host the template.',
          bullets: [],
          cta: { label: 'Go back to step 1', href: '/onboarding', disabled: true },
        };
      }
      return {
        icon: <IconMail size={36} />,
        title: 'Design your first template',
        subtitle: 'Build a reusable email design. The drag-and-drop editor handles the heavy lifting.',
        bullets: [
          'Start from a category template (Welcome, Promo, Newsletter…)',
          'Drag blocks: text, images, buttons, social',
          'Or import an existing MJML file',
        ],
        cta: { label: 'Open editor', href: `/clients/${firstClientId}/templates` },
      };
  }
}

/* ─── Done state ─────────────────────────────────────────────────── */

function DoneCard({ onFinish }: { onFinish: () => void }) {
  return (
    <div className={`${styles.card} ${styles.cardDone}`}>
      <div className={styles.cardIcon} aria-hidden="true">
        <IconSparkles size={36} />
      </div>

      <Heading size="xl" className={styles.cardTitle}>You're all set ✨</Heading>
      <Text tone="muted" className={styles.cardSub}>
        Your workspace is ready. From here you can launch your first campaign,
        test sends to your inbox, or invite your team.
      </Text>

      <div className={styles.cardActions}>
        <Button
          variant="primary"
          size="lg"
          trailing={<IconArrowRight size={16} />}
          onClick={onFinish}
        >
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
