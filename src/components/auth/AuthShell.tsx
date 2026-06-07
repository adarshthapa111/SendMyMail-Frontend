import { Fragment, type ReactNode } from 'react';
import { IconCheck, IconTrendingUp } from '@tabler/icons-react';
import s from '@styles/components/auth/AuthShell.module.scss';

/* Full-bleed auth shell — used by Signup / Login / Verify / WorkspaceSetup / Forgot / Reset.
   Left:  warm editorial brand panel (composable via the sub-exports below).
   Right: clean white form panel.
   The shell uses 100vw × 100vh and is intended to render OUTSIDE the AppShell chrome. */

export function AuthShell({ children }: { children: ReactNode }) {
  /* Auth pages are the brand experience BEFORE a user has signed in
     and picked an app theme. Always render in default theme so the
     warm-editorial brand DNA is what new visitors see. */
  return <div data-theme="default" className={s.shell}>{children}</div>;
}

/* ─── LEFT panel pieces ─────────────────────────────────────────────────── */

export function AuthBrand({ children }: { children: ReactNode }) {
  return <div className={s.brand}>{children}</div>;
}

export function AuthLogo({ className }: { className?: string }) {
  return (
    <div className={`${s.logo} ${className ?? ''}`}>
      <span className={s.mark}>S</span>
      <strong>SendMyMail</strong>
    </div>
  );
}

export function AuthBrandContent({ children }: { children: ReactNode }) {
  return <div className={s.content}>{children}</div>;
}

export function AuthBrandFoot({ children }: { children: ReactNode }) {
  return <div className={s.foot}>{children}</div>;
}

export function AuthEyebrow({ children }: { children: ReactNode }) {
  return (
    <span className={s.eyebrow}>
      <span className={s.dot} />
      {children}
    </span>
  );
}

export function AuthH1({ children, em }: { children: ReactNode; em?: ReactNode }) {
  return (
    <h1 className={s.pitchH1}>
      {children}
      {em ? <> <em>{em}</em></> : null}
    </h1>
  );
}

export function AuthLede({ children }: { children: ReactNode }) {
  return <p className={s.pitchLede}>{children}</p>;
}

export function AuthTick({ children }: { children: ReactNode }) {
  return (
    <div className={s.tickline}>
      <span className={s.tk}><IconCheck size={11} /></span>
      <span>{children}</span>
    </div>
  );
}

/* ─── Testimonial card (signup) ─────────────────────────────────────────── */

interface AuthTestimonialProps {
  avatarInitials: string;
  avatarGradient: string;          /* e.g. "150deg,#7A71D8,#4B43A8" */
  quote: ReactNode;
  name: string;
  sub: string;
}
export function AuthTestimonial({ avatarInitials, avatarGradient, quote, name, sub }: AuthTestimonialProps) {
  return (
    <div className={s.testimonial}>
      <span className={s.av} style={{ background: `linear-gradient(${avatarGradient})` }}>{avatarInitials}</span>
      <div>
        <div className={s.tq}>{quote}</div>
        <div className={s.tw}><b>{name}</b> · {sub}</div>
      </div>
    </div>
  );
}

/* ─── Snapshot card (login) ─────────────────────────────────────────────── */

interface AuthSnapCardProps {
  label: string;
  number: string;
  trendLabel?: string;
  caption?: string;
  metrics?: { label: string; value: string }[];
}
export function AuthSnapCard({ label, number, trendLabel, caption, metrics }: AuthSnapCardProps) {
  return (
    <div className={s.snapCard}>
      <div className={s.snapLbl}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div className={s.snapNum}>{number}</div>
        {trendLabel ? (
          <span className={s.snapTrend}><IconTrendingUp size={11} /> {trendLabel}</span>
        ) : null}
      </div>
      {caption ? <div className={s.snapCaption}>{caption}</div> : null}
      {metrics && metrics.length > 0 ? (
        <div className={s.metricLine}>
          {metrics.map((m) => (
            <div key={m.label}>{m.label} <b>{m.value}</b></div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ─── Founder handnote (login) ──────────────────────────────────────────── */

interface AuthHandnoteProps {
  avatar: string;
  children: ReactNode;
  signature?: string;
}
export function AuthHandnote({ avatar, children, signature }: AuthHandnoteProps) {
  return (
    <div className={s.handnote}>
      <span className={s.hnAv}>{avatar}</span>
      <span>{children} {signature ? <span className={s.sig}>— {signature}</span> : null}</span>
    </div>
  );
}

/* ─── Brand strip — agency chips (signup) ───────────────────────────────── */

interface AuthBrandStripProps {
  label?: string;
  chips: { initials: string; gradient: string; title?: string }[];
  trailing?: ReactNode;
}
export function AuthBrandStrip({ label, chips, trailing }: AuthBrandStripProps) {
  return (
    <div className={s.brandStrip}>
      {label ? <span className={s.bsLabel}>{label}</span> : null}
      {chips.map((c) => (
        <span
          key={c.initials + c.title}
          className={s.brandChip}
          style={{ background: `linear-gradient(${c.gradient})` }}
          title={c.title}
        >
          {c.initials}
        </span>
      ))}
      {trailing}
    </div>
  );
}

/* ─── Stat strip — platform metrics (login) ─────────────────────────────── */

interface AuthStatStripProps {
  items: { value: string; label: string }[];
}
export function AuthStatStrip({ items }: AuthStatStripProps) {
  return (
    <div className={s.statStrip}>
      {items.map((it, i) => (
        <Fragment key={it.label}>
          {i > 0 ? <span className={s.ssDot} /> : null}
          <span className={s.ssItem}><b>{it.value}</b> {it.label}</span>
        </Fragment>
      ))}
    </div>
  );
}

/* ─── RIGHT panel ───────────────────────────────────────────────────────── */

export function AuthForm({ children }: { children: ReactNode }) {
  return (
    <div className={s.form}>
      <div className={s.formInner}>
        <AuthLogo className={s.formLogo} />
        {children}
      </div>
    </div>
  );
}
