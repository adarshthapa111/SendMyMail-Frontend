import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading, Text, Field, Input, Select, Button, Pill } from '../../components/ui';
import { IconArrowRight } from '@tabler/icons-react';
import { workspaceSetup } from '../../lib/api/auth';
import { setJwt } from '../../lib/api/jwt';
import { useAuth } from '../../hooks/useAuth';
import { withFormToast } from '../../lib/toast';
import {
  AuthShell, AuthBrand, AuthBrandContent,
  AuthEyebrow, AuthH1, AuthLede, AuthTick,
  AuthForm, AuthLogo,
} from '../../components/auth/AuthShell';

/* /workspace-setup — real form posting to POST /v1/agencies/me.
   /onboarding — placeholder for now (real FTUX shell lands in a later PR). */

export function WorkspaceSetup() {
  const navigate = useNavigate();
  const { agency, hydrate, user } = useAuth();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('NP');
  const [billingEmail, setBillingEmail] = useState(user?.email ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const res = await withFormToast(
        workspaceSetup({ name, country, billingEmail }),
        {
          loading: 'Setting up your workspace…',
          success: 'Workspace ready ✨',
          onFieldError: (err) => setFieldErrors({ [err.field!]: err.message }),
        },
      );
      setJwt(res.data.jwt);
      if (user) hydrate({ user, agency: res.data.agency });
      navigate('/onboarding', { replace: true });
    } catch { /* toast / field error shown */ }
    finally { setSubmitting(false); }
  }

  return (
    <AuthShell>
      <AuthBrand>
        <AuthLogo />
        <AuthBrandContent>
          <AuthEyebrow>Step 1 of 2</AuthEyebrow>
          <AuthH1 em="agency's home.">Set up your</AuthH1>
          <AuthLede>
            This becomes the workspace your team logs into and your clients see on invoices.
            Don't overthink it — you can change everything later.
          </AuthLede>
          <AuthTick><b>Agency name</b> — shown on invoices, in the topbar, and on the brand panel of every email you send.</AuthTick>
          <AuthTick><b>Country</b> — sets your default currency, tax rules, and the IPs we send from.</AuthTick>
          <AuthTick><b>Billing email</b> — where invoices and payment receipts go (you can route to your accountant later).</AuthTick>
        </AuthBrandContent>
      </AuthBrand>

      <AuthForm>
        <div className="flex gap-2 mb-4">
          <Pill variant="green" dot>Email verified</Pill>
          <Pill variant="indigo">Step 1 · Workspace</Pill>
        </div>

        <Heading size="xl" className="mb-1">Tell us about your agency</Heading>
        <Text tone="muted" className="mb-6">
          We'll use this to brand emails &amp; bill you correctly. Takes about a minute.
          {agency?.name ? <> <br/><span className="text-soft">(your placeholder name: {agency.name})</span></> : null}
        </Text>

        <form onSubmit={onSubmit}>
          <Field label="Agency name" error={fieldErrors.name} helper="The name your clients see on invoices &amp; the brand panel.">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nirvana Agency" required invalid={!!fieldErrors.name} />
          </Field>
          <Field label="Country" error={fieldErrors.country}>
            <Select value={country} onChange={(e) => setCountry(e.target.value)} invalid={!!fieldErrors.country}>
              <option value="NP">Nepal</option>
              <option value="IN">India</option>
              <option value="BD">Bangladesh</option>
              <option value="LK">Sri Lanka</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </Select>
          </Field>
          <Field label="Billing email" error={fieldErrors.billingEmail} helper="Invoices &amp; payment receipts go here.">
            <Input type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} placeholder="billing@youragency.com" required invalid={!!fieldErrors.billingEmail} />
          </Field>

          <Button type="submit" variant="primary" block size="lg" loading={submitting} trailing={!submitting ? <IconArrowRight size={16} /> : undefined}>
            {submitting ? 'Setting up…' : 'Continue'}
          </Button>
        </form>
      </AuthForm>
    </AuthShell>
  );
}

export { Onboarding } from './Onboarding';
