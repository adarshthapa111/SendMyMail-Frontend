import { useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { Heading, Text, Field, Input, Button, Checkbox } from '../../components/ui';
import { IconArrowRight, IconMail, IconCheck, IconShieldCheck, IconClock } from '@tabler/icons-react';
import * as authApi from '../../lib/api/auth';
import { setJwt } from '../../lib/api/jwt';
import { useAuth } from '../../hooks/useAuth';
import { withFormToast, toast } from '../../lib/toast';
import { PublicPlaceholder } from '../_shared/PublicPlaceholder';
import {
  AuthShell, AuthBrand, AuthBrandContent, AuthBrandFoot,
  AuthEyebrow, AuthH1, AuthLede, AuthTick,
  AuthTestimonial, AuthBrandStrip,
  AuthSnapCard, AuthHandnote, AuthStatStrip,
  AuthForm, AuthLogo,
} from '../../components/auth/AuthShell';

/* Pre-auth pages — all rendered standalone (no AppShell chrome).
   Loading + success + error feedback all goes through react-hot-toast via withFormToast.
   Buttons show their own inline spinner via the `loading` prop on Button.
   Layout: full-bleed split via <AuthShell> — warm brand panel on the left, white form on the right. */

/* ─── /signup ───────────────────────────────────────────────────────────── */

export function Signup() {
  const navigate = useNavigate();
  const { hydrate } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please agree to the Terms first');
      return;
    }
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await withFormToast(
        authApi.signup({ name, email, password }),
        {
          loading: 'Creating your workspace…',
          success: `Welcome, ${name.split(' ')[0] || 'there'} 👋`,
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setJwt(res.data.jwt);
      hydrate({ user: res.data.user, agency: res.data.agency });
      navigate('/verify', { replace: true });
    } catch { /* toast / field error already shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>For Nepali agencies</AuthEyebrow>
          <AuthH1 em="one warm desk.">Run every client's email from</AuthH1>
          <AuthLede>
            White-label workspaces, NPR billing, deliverability tuned for Gmail &amp; Outlook
            — without juggling 8 Mailchimp logins.
          </AuthLede>
          <AuthTick><b>Per-client workspaces</b> — separate domain, branding, billing, contacts.</AuthTick>
          <AuthTick><b>Bill in रू</b> — eSewa, Khalti, IME Pay, plus PAN-backed VAT invoices.</AuthTick>
          <AuthTick><b>96.4% inbox rate</b> at Gmail across the platform last 7 days.</AuthTick>
        </AuthBrandContent>
        <AuthBrandFoot>
          <AuthTestimonial
            avatarInitials="RT"
            avatarGradient="150deg,#7A71D8,#4B43A8"
            name="Roshani Tamang"
            sub="Threesixty Studio, Lalitpur"
            quote='"We replaced 8 Mailchimp accounts with SendMyMail. The client switcher alone saves us 4 hours a week."'
          />
          <AuthBrandStrip
            label="Trusted by"
            chips={[
              { initials: 'KS', gradient: '145deg,#27B98A,#149068', title: 'Khukri Spices' },
              { initials: 'HT', gradient: '145deg,#EA7B4F,#C9542C', title: 'Himalaya Trekking' },
              { initials: 'PC', gradient: '150deg,#7A71D8,#4B43A8', title: 'Pashmina Co.' },
              { initials: 'NB', gradient: '145deg,#4F95E0,#2D6FB8', title: 'Newa Bites' },
              { initials: 'YS', gradient: '145deg,#C79A2E,#A07A12', title: 'Yak Studios' },
              { initials: 'EG', gradient: '145deg,#3FA8A0,#1FA39B', title: 'Everest Gear' },
            ]}
            trailing={<span style={{ fontSize: 12, marginLeft: 4 }}>+ 36 more</span>}
          />
        </AuthBrandFoot>
      </AuthBrand>

      <AuthForm>
        <Heading size="xl" className="mb-1">Start your agency, free.</Heading>
        <Text tone="muted" className="mb-6">14-day trial · no credit card · ~60 seconds to your first client.</Text>

        <form onSubmit={onSubmit}>
          <Field label="Your name" error={fieldErrors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Prasiddha Karki" required invalid={!!fieldErrors.name} />
          </Field>
          <Field label="Work email" error={fieldErrors.email} helper="We'll send a 6-digit code to verify.">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youragency.com" required invalid={!!fieldErrors.email} />
          </Field>
          <Field label="Password" error={fieldErrors.password} helper="At least 8 chars, 1 number, 1 symbol.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required invalid={!!fieldErrors.password} />
          </Field>
          <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mb-5">
            I'll only email people who opted in, and I agree to the <a className="text-primary-ink font-semibold">Terms</a>, <a className="text-primary-ink font-semibold">Privacy</a> &amp; <a className="text-primary-ink font-semibold">Anti-Spam Policy</a>.
          </Checkbox>
          <Button type="submit" variant="primary" block size="lg" loading={submitting} trailing={!submitting ? <IconArrowRight size={16} /> : undefined}>
            {submitting ? 'Creating workspace…' : 'Create my workspace'}
          </Button>
        </form>

        <Text tone="muted" size="sm" className="text-center mt-5">
          Already running an agency? <Link to="/login" className="text-primary-ink font-semibold no-underline">Log in</Link>
        </Text>
      </AuthForm>
    </AuthShell>
  );
}

/* ─── /login ────────────────────────────────────────────────────────────── */

export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await withFormToast(
        login(email, password),
        {
          loading: 'Signing you in…',
          success: 'Welcome back 👋',
        },
      );
      if (!data.user.emailVerified) navigate('/verify', { replace: true });
      else if (!data.agency.setupComplete) navigate('/workspace-setup', { replace: true });
      else navigate(next, { replace: true });
    } catch { /* error toast shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>Good morning</AuthEyebrow>
          <AuthH1 em="left off.">Pick up where you</AuthH1>
          <AuthLede>
            Here's what your agency's inbox did while you slept — every client, every campaign, one screen.
          </AuthLede>
          <AuthSnapCard
            label="Yesterday · all clients"
            number="38,420"
            trendLabel="+12%"
            caption="emails delivered to the inbox"
            metrics={[
              { label: 'Open rate',  value: '42.1%' },
              { label: 'Click rate', value: '5.9%' },
              { label: 'Revenue',    value: 'रू 3.4L' },
            ]}
          />
        </AuthBrandContent>
        <AuthBrandFoot>
          <AuthHandnote avatar="S" signature="Sushant, founder">
            "Most agency owners I know start their day by logging in here. <b>Hope it makes Monday a little lighter.</b>"
          </AuthHandnote>
          <AuthStatStrip
            items={[
              { value: '42',    label: 'agencies' },
              { value: '3.2M',  label: 'emails / 30 days' },
              { value: '96.4%', label: 'inbox rate' },
              { value: '4.8★',  label: 'from 124 reviews' },
            ]}
          />
        </AuthBrandFoot>
      </AuthBrand>

      <AuthForm>
        <Heading size="xl" className="mb-1">Welcome back.</Heading>
        <Text tone="muted" className="mb-6">Sign in to your agency workspace.</Text>

        <form onSubmit={onSubmit}>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youragency.com" required />
          </Field>
          <Field
            label="Password"
            helper={<Link to="/forgot" className="text-primary-ink font-semibold no-underline">Forgot it?</Link>}
          >
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          <Button type="submit" variant="primary" block size="lg" loading={submitting} trailing={!submitting ? <IconArrowRight size={16} /> : undefined}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <Text tone="muted" size="sm" className="text-center mt-5">
          New to SendMyMail? <Link to="/signup" className="text-primary-ink font-semibold no-underline">Create an account</Link>
        </Text>
      </AuthForm>
    </AuthShell>
  );
}

/* ─── /verify ───────────────────────────────────────────────────────────── */

export function Verify() {
  const navigate = useNavigate();
  const { user, agency, hydrate } = useAuth();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFieldError(undefined);
    try {
      const res = await withFormToast(
        authApi.verifyCode({ code }),
        {
          loading: 'Checking your code…',
          success: 'Email verified ✓',
          onFieldError: (err) => setFieldError(err.message),
        },
      );
      setJwt(res.data.jwt);
      if (user && agency) hydrate({ user: { ...user, emailVerified: true }, agency });
      if (agency?.setupComplete) navigate('/dashboard', { replace: true });
      else navigate('/workspace-setup', { replace: true });
    } catch { /* toast / field error shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>Almost there</AuthEyebrow>
          <AuthH1 em="who you are.">One quick check —</AuthH1>
          <AuthLede>
            We email a one-time code so nobody can sign up as you. Takes about ten seconds —
            and it's the only time you'll need to do this.
          </AuthLede>
          <AuthTick><b>Anti-spam</b> — only verified domains can send through SendMyMail.</AuthTick>
          <AuthTick><b>Reputation protection</b> — verified senders keep deliverability high for everyone.</AuthTick>
          <AuthTick><b>Account recovery</b> — your verified email is how we reach you if something breaks.</AuthTick>
        </AuthBrandContent>
      </AuthBrand>

      <AuthForm>
        <div
          className="grid place-items-center w-14 h-14 rounded-full bg-primary-light text-primary mx-auto mb-4"
        >
          <IconMail size={26} />
        </div>
        <Heading size="lg" className="mb-1 text-center">Check your inbox</Heading>
        <Text tone="muted" className="text-center mb-6">
          We sent a 6-digit code to <span className="text-ink font-semibold">{user?.email ?? 'your email'}</span>.
        </Text>

        <form onSubmit={onSubmit}>
          <Field label="Verification code" error={fieldError} helper={!fieldError ? 'Expires in 15 minutes.' : undefined}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              placeholder="123456"
              required
              invalid={!!fieldError}
              style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: 22 }}
            />
          </Field>
          <Button type="submit" variant="primary" block size="lg" loading={submitting} disabled={code.length !== 6}>
            {submitting ? 'Verifying…' : 'Verify & continue'}
          </Button>
        </form>

        <Text tone="muted" size="sm" className="text-center mt-5">
          Wrong email? <Link to="/login" className="text-primary-ink font-semibold no-underline">Sign in with a different account</Link>
        </Text>
      </AuthForm>
    </AuthShell>
  );
}

/* ─── /forgot ───────────────────────────────────────────────────────────── */

export function Forgot() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await withFormToast(
        authApi.forgot({ email }),
        {
          loading: 'Sending reset link…',
          success: 'Check your inbox in a moment',
        },
      );
    } catch { /* swallow — backend is anti-enumeration silent */ }
    finally {
      setSubmitting(false);
      setDone(true);
    }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>It happens</AuthEyebrow>
          <AuthH1 em="back in.">Let's get you</AuthH1>
          <AuthLede>
            Send yourself a reset link — we'll email it to the address on your account.
            The link is good for one hour, then it expires automatically.
          </AuthLede>
          <AuthTick><b>One-click reset</b> — open the email on any device.</AuthTick>
          <AuthTick><b>Anti-enumeration</b> — we always say "check your inbox", whether the email exists or not.</AuthTick>
          <AuthTick><b>argon2id hashing</b> — your old password isn't stored, even by us.</AuthTick>
        </AuthBrandContent>
      </AuthBrand>

      <AuthForm>
        {done ? (
          <>
            <div className="grid place-items-center w-14 h-14 rounded-full bg-green-bg text-green mx-auto mb-4">
              <IconCheck size={26} />
            </div>
            <Heading size="lg" className="mb-1 text-center">Check your inbox</Heading>
            <Text tone="muted" className="text-center mb-6">
              If <span className="text-ink font-semibold">{email}</span> has a SendMyMail account, we just sent a password reset link. It expires in 1 hour.
            </Text>
            <Link to="/login" className="text-primary-ink font-semibold no-underline text-center block text-sm">
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Heading size="lg" className="mb-1">Reset your password</Heading>
            <Text tone="muted" className="mb-6">Enter the email you signed up with. We'll send a reset link.</Text>

            <form onSubmit={onSubmit}>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@youragency.com" required />
              </Field>
              <Button type="submit" variant="primary" block size="lg" loading={submitting}>
                {submitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>

            <Text tone="muted" size="sm" className="text-center mt-5">
              Remembered it? <Link to="/login" className="text-primary-ink font-semibold no-underline">Sign in</Link>
            </Text>
          </>
        )}
      </AuthForm>
    </AuthShell>
  );
}

/* ─── /reset/:token ─────────────────────────────────────────────────────── */

export function Reset() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFieldError(undefined);

    if (password !== confirm) {
      setFieldError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await withFormToast(
        authApi.reset(token as string, { password }),
        {
          loading: 'Updating your password…',
          success: 'Password updated — sign in with the new one',
          onFieldError: (err) => setFieldError(err.message),
        },
      );
      navigate('/login?reset=ok', { replace: true });
    } catch { /* toast / field error shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>Almost done</AuthEyebrow>
          <AuthH1 em="a new password.">Set</AuthH1>
          <AuthLede>
            Pick something only you would remember. We hash it with argon2id, so even our
            engineers can't see it — only verify it against what you type later.
          </AuthLede>
          <AuthTick><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconShieldCheck size={13} /> <b>argon2id</b> hashing — slow on purpose, expensive to brute-force.</span></AuthTick>
          <AuthTick><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconClock size={13} /> <b>1-hour link</b> — this reset URL expires shortly.</span></AuthTick>
          <AuthTick><b>All sessions revoked</b> — every existing JWT for this account dies on update.</AuthTick>
        </AuthBrandContent>
      </AuthBrand>

      <AuthForm>
        {!token ? (
          <>
            <Heading size="lg" className="mb-1">Invalid link</Heading>
            <Text tone="muted" className="mb-6">This password reset link is missing its token. Try requesting a new one.</Text>
            <Link to="/forgot"><Button variant="primary" block>Request a new link</Button></Link>
          </>
        ) : (
          <>
            <Heading size="lg" className="mb-1">Set a new password</Heading>
            <Text tone="muted" className="mb-6">Pick something strong. We hash with argon2id.</Text>

            <form onSubmit={onSubmit}>
              <Field label="New password" error={fieldError} helper={!fieldError ? 'At least 8 chars, 1 number, 1 symbol.' : undefined}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required invalid={!!fieldError} />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
              <Button type="submit" variant="primary" block size="lg" loading={submitting}>
                {submitting ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </AuthForm>
    </AuthShell>
  );
}

/* ─── /invite/:token (placeholder for now — real version in PR 2) ──────── */

export function Invite() {
  return (
    <PublicPlaceholder
      title="Accept your invitation"
      subtitle="The invite-acceptance flow lands in PR 2 of feature-auth-frontend."
      mockup="invite.html"
    />
  );
}
